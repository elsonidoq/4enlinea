#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

psql "$DATABASE_URL" -c "DELETE FROM public.false_positive_records; DELETE FROM public.candidates;"
