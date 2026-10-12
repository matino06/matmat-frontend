#!/bin/sh
# PROTOTIP: plan fizike sa Solom (umjesto Sonneta) i cachingom, u out_sol/ (stari plan ostaje u out/).
# Čitanje i razvrstavanje stranica te opseg ponovno se koriste iz out_sol/ (već izrađeni).
set -e
cd "$(dirname "$0")"
export OUTDIR=out_sol PLAN_MODEL=openai/gpt-6.1-sol CACHE_PROMPTS=1 COARSE=1 HTTP_TIMEOUT=900
wc -l < cache/costs.jsonl > out_sol/costs_start
for s in points edges group repair coverage; do echo "== $s"; .venv/bin/python pipeline.py $s; done
TAG=nultasol SEED=0 .venv/bin/python nulta_check.py
TAG=nultasol2 SEED=1 .venv/bin/python nulta_check.py
