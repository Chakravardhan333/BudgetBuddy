import sys
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.contrib.auth.models import User
from accounts.models import UserProfile

class Command(BaseCommand):
    help = "Safely verifies database connectivity, SSL status, migrations, and model operations without leaking credentials."

    def add_arguments(self, parser):
        parser.add_argument(
            '--check-only',
            action='store_true',
            help='Only check connection without creating test transactions',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== BudgetBuddy Database Diagnostic ==="))

        # 1. Inspect engine and configuration
        engine = connection.settings_dict.get('ENGINE', '')
        raw_host = connection.settings_dict.get('HOST', '')
        db_name = connection.settings_dict.get('NAME', '')
        ssl_mode = connection.settings_dict.get('OPTIONS', {}).get('sslmode', 'none')

        is_postgres = 'postgresql' in engine
        masked_host = self.mask_host(str(raw_host)) if raw_host else ('local-file' if not is_postgres else 'localhost')

        self.stdout.write(f"Database Engine:  {engine}")
        self.stdout.write(f"Target Host:      {masked_host}")
        self.stdout.write(f"Database Name:    {Path(str(db_name)).name if not is_postgres else str(db_name)}")
        self.stdout.write(f"Configured SSL:   {ssl_mode}")

        # 2. Test Connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                row = cursor.fetchone()
                if not row or row[0] != 1:
                    self.stderr.write(self.style.ERROR("Database connection test query failed: unexpected result."))
                    sys.exit(1)
            self.stdout.write(self.style.SUCCESS("[OK] Database connection verified successfully."))
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"[FAIL] Unable to connect to database: {exc}"))
            sys.exit(1)

        # 3. Check Live SSL in PostgreSQL
        if is_postgres:
            try:
                with connection.cursor() as cursor:
                    # In PostgreSQL with ssl enabled, pg_stat_ssl or connection properties can be checked
                    cursor.execute("SELECT pg_is_in_recovery();")
                    cursor.fetchone()
                    try:
                        cursor.execute("SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid();")
                        ssl_row = cursor.fetchone()
                        if ssl_row and ssl_row[0]:
                            self.stdout.write(self.style.SUCCESS("[OK] Live SSL connection active with PostgreSQL."))
                        else:
                            self.stdout.write(self.style.WARNING("[INFO] SSL mode requested; backend active."))
                    except Exception:
                        self.stdout.write(self.style.SUCCESS("[OK] PostgreSQL connection active."))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"[NOTICE] SSL check info query skipped: {e}"))

        # 4. Check Migrations
        try:
            executor = MigrationExecutor(connection)
            targets = executor.loader.graph.leaf_nodes()
            plan = executor.migration_plan(targets)
            if plan:
                self.stdout.write(self.style.WARNING(f"[PENDING] There are {len(plan)} pending migration(s) to apply."))
                for migration, backwards in plan:
                    self.stdout.write(f"  - {migration.app_label}.{migration.name}")
            else:
                self.stdout.write(self.style.SUCCESS("[OK] All database migrations are completely up to date."))
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"[FAIL] Error checking migrations: {exc}"))
            sys.exit(1)

        # 5. Non-destructive isolation & test record creation (in rollback transaction)
        if not options.get('check_only'):
            if plan:
                self.stdout.write(self.style.WARNING("[INFO] Skipping CRUD probe because database migrations are pending. Apply migrations with 'python manage.py migrate'."))
            else:
                try:
                    with transaction.atomic():
                        test_username = "__test_diagnostic_probe_user__"
                        probe_user = User.objects.create_user(
                            username=test_username,
                            email='diagnostic_probe@budgetbuddy.test',
                            password='ProbePassword123!'
                        )
                        # Verify profile signal triggered
                        profile = UserProfile.objects.get(user=probe_user)
                        self.assertEqualOrRaise(profile.user.username, test_username)
                        # Roll back so nothing remains in the DB
                        transaction.set_rollback(True)

                    self.stdout.write(self.style.SUCCESS("[OK] CRUD probe verified: records can be created, isolated, and safely rolled back."))
                except Exception as exc:
                    self.stderr.write(self.style.ERROR(f"[FAIL] Test CRUD verification failed: {exc}"))
                    sys.exit(1)

        self.stdout.write(self.style.MIGRATE_HEADING("=== Diagnostic completed successfully. ==="))

    def mask_host(self, host: str) -> str:
        if '.' not in host:
            return host[:2] + '***'
        parts = host.split('.')
        masked_prefix = parts[0][:3] + '***' if len(parts[0]) > 3 else '***'
        return f"{masked_prefix}.{'.'.join(parts[1:])}"

    def assertEqualOrRaise(self, a, b):
        if a != b:
            raise ValueError(f"Assertion failed: {a} != {b}")
