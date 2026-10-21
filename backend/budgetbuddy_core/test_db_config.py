import os
from unittest import TestCase
from unittest.mock import patch
from pathlib import Path
import dj_database_url

class DatabaseConfigTests(TestCase):
    def setUp(self):
        self.base_dir = Path(__file__).resolve().parent.parent

    def get_database_config(self, db_url, ssl_mode_env=None):
        env = {}
        if db_url is not None:
            env['DATABASE_URL'] = db_url
        if ssl_mode_env is not None:
            env['DB_SSL_MODE'] = ssl_mode_env

        with patch.dict(os.environ, env, clear=False):
            # Mirror the settings.py database selection logic
            database_url = os.environ.get('DATABASE_URL', '').strip()
            if database_url:
                db_config = dj_database_url.parse(
                    database_url,
                    conn_max_age=600,
                    conn_health_checks=True,
                )
                if 'postgresql' in db_config.get('ENGINE', ''):
                    db_config.setdefault('OPTIONS', {})
                    if 'sslmode' not in db_config['OPTIONS']:
                        db_config['OPTIONS']['sslmode'] = os.environ.get('DB_SSL_MODE', 'require')
            else:
                db_config = {
                    'ENGINE': 'django.db.backends.sqlite3',
                    'NAME': self.base_dir / 'db.sqlite3',
                }
            return db_config

    def test_default_sqlite_fallback_when_database_url_absent(self):
        config = self.get_database_config('')
        self.assertEqual(config['ENGINE'], 'django.db.backends.sqlite3')
        self.assertEqual(config['NAME'], self.base_dir / 'db.sqlite3')
        self.assertNotIn('OPTIONS', config)

    def test_postgresql_selection_with_neon_ssl_default(self):
        neon_url = 'postgresql://cloud_user:secretpass@ep-demo-123456.us-east-2.aws.neon.tech/neondb'
        config = self.get_database_config(neon_url)
        self.assertEqual(config['ENGINE'], 'django.db.backends.postgresql')
        self.assertEqual(config['USER'], 'cloud_user')
        self.assertEqual(config['PASSWORD'], 'secretpass')
        self.assertEqual(config['HOST'], 'ep-demo-123456.us-east-2.aws.neon.tech')
        self.assertEqual(config['NAME'], 'neondb')
        self.assertEqual(config['CONN_MAX_AGE'], 600)
        self.assertTrue(config['CONN_HEALTH_CHECKS'])
        self.assertEqual(config.get('OPTIONS', {}).get('sslmode'), 'require')

    def test_postgresql_preserves_explicit_sslmode(self):
        url_with_ssl = 'postgres://cloud_user:secretpass@ep-demo.aws.neon.tech/neondb?sslmode=verify-full'
        config = self.get_database_config(url_with_ssl)
        self.assertEqual(config['ENGINE'], 'django.db.backends.postgresql')
        self.assertEqual(config.get('OPTIONS', {}).get('sslmode'), 'verify-full')

    def test_postgresql_respects_db_ssl_mode_override(self):
        url = 'postgresql://cloud_user:secretpass@localhost:5432/neondb'
        config = self.get_database_config(url, ssl_mode_env='disable')
        self.assertEqual(config['ENGINE'], 'django.db.backends.postgresql')
        self.assertEqual(config.get('OPTIONS', {}).get('sslmode'), 'disable')
