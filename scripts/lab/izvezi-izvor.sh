#!/usr/bin/env bash
# Izvoz prvih varijacija zadataka vlastitih predmeta u lab-out/source.json (samo čitanje baze).
# Lozinku čita iz lokalne konfiguracije backenda; transakcija je read-only, pa izvoz ništa ne mijenja.
#
#   scripts/lab/izvezi-izvor.sh [putanja-do-matmat-backend]
set -euo pipefail
BACKEND="$(cd "${1:-$(dirname "$0")/../../../matmat-backend}" && pwd)"
cd "$(dirname "$0")/../.."   # lab-out/ je uvijek u korijenu repozitorija, odakle ga čita generiraj-lekcije.mjs
PROPS="$BACKEND/src/main/resources/application-local.properties"
URL=$(grep '^spring.datasource.url=' "$PROPS" | sed -E 's#.*postgresql://([^:/]+):([0-9]+)/(.*)#host=\1 port=\2 dbname=\3#')
DB_USER=$(grep '^spring.datasource.username=' "$PROPS" | cut -d= -f2-)
export PGPASSWORD=$(grep '^spring.datasource.password=' "$PROPS" | cut -d= -f2-)
export PGOPTIONS='-c default_transaction_read_only=on'
mkdir -p lab-out
psql "$URL user=$DB_USER sslmode=require" -At -c "
SELECT json_agg(x ORDER BY x.course_id, x.objective_id) FROM (
  SELECT c.course_id, c.subject, c.level, c.course_name, lo.objective_id, lo.objective_name, lo.kind,
         t.task_id, t.task_text, t.explanation, t.results, t.sketch
  FROM course c
  JOIN course_objective co ON co.course_id = c.course_id
  JOIN learning_objective lo ON lo.objective_id = co.objective_id
  JOIN task t ON t.objective_id = lo.objective_id AND t.variation = 1
  WHERE c.owner_account_id IS NOT NULL) x;" > lab-out/source.json
echo "Izvezeno: $(python3 -c 'import json;print(len(json.load(open("lab-out/source.json"))))') lekcija u lab-out/source.json"
