#!/usr/bin/env bash
# Izvoz varijacija 2–4 vlastitih predmeta s lekcijom 1. varijacije kao predloškom u lab-out/source-varijacije.json
# (samo čitanje baze). generiraj-lekcije.mjs --izvor source-varijacije.json ih izrađuje kao backend (LessonUiStep).
#
#   scripts/lab/izvezi-varijacije.sh [putanja-do-matmat-backend]
set -euo pipefail
BACKEND="$(cd "${1:-$(dirname "$0")/../../../matmat-backend}" && pwd)"
cd "$(dirname "$0")/../.."
PROPS="$BACKEND/src/main/resources/application-local.properties"
URL=$(grep '^spring.datasource.url=' "$PROPS" | sed -E 's#.*postgresql://([^:/]+):([0-9]+)/(.*)#host=\1 port=\2 dbname=\3#')
DB_USER=$(grep '^spring.datasource.username=' "$PROPS" | cut -d= -f2-)
export PGPASSWORD=$(grep '^spring.datasource.password=' "$PROPS" | cut -d= -f2-)
export PGOPTIONS='-c default_transaction_read_only=on'
mkdir -p lab-out
psql "$URL user=$DB_USER sslmode=require" -At -c "
SELECT coalesce(json_agg(x ORDER BY x.course_id, x.objective_id, x.variation), '[]') FROM (
  SELECT c.course_id, c.subject, c.level, c.course_name, lo.objective_id, lo.objective_name, lo.kind,
         t.task_id, t.variation, t.task_text, t.explanation, t.results, t.sketch, v1.lesson_ui::json AS predlozak
  FROM course c
  JOIN course_objective co ON co.course_id = c.course_id
  JOIN learning_objective lo ON lo.objective_id = co.objective_id
  JOIN task t ON t.objective_id = lo.objective_id AND t.variation > 1
  JOIN task v1 ON v1.objective_id = lo.objective_id AND v1.variation = 1 AND v1.lesson_ui IS NOT NULL
  WHERE c.owner_account_id IS NOT NULL) x;" > lab-out/source-varijacije.json
echo "Izvezeno: $(python3 -c 'import json;print(len(json.load(open("lab-out/source-varijacije.json"))))') varijacija u lab-out/source-varijacije.json"
