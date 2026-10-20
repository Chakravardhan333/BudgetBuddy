#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install Python requirements
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Seed demonstration accounts if needed
python manage.py seed_users
python manage.py seed_financial_data
