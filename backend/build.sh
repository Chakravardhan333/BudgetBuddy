#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install Python requirements
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static assets
python manage.py collectstatic --no-input

# Optional: Seed demonstration accounts only if explicitly requested in environment
if [ "$SEED_DEMO_DATA" = "True" ] || [ "$SEED_DEMO_DATA" = "true" ] || [ "$SEED_DEMO_DATA" = "1" ]; then
    echo "SEED_DEMO_DATA is active: Seeding demonstration accounts and financial records..."
    python manage.py seed_users
    python manage.py seed_financial_data
else
    echo "SEED_DEMO_DATA is not set: Skipping demo account creation for clean production database."
fi
