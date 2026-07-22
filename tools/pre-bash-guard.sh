#!/usr/bin/env bash
#
# pre-bash-guard.sh  (v3 - escopado ao repo de producao BeAltea/alteapay)
# Hook PreToolUse do Claude Code: so enforce a protecao de main quando o comando
# alveja o repositorio de producao BeAltea/alteapay (aceita tambem o nome antigo
# BeAltea/altea-pay via redirect). Em outros repos (ex.: alteapay-agents, onde
# main e a branch de trabalho legitima), NAO interfere. Alinhado a RED FLAG
# #5. Garantia autoritativa continua sendo a branch protection (enforce_admins
# ON) no GitHub, que e server-side e nao depende deste hook.
#
# PreToolUse recebe JSON no stdin { tool_name, tool_input }. Exit code 2 BLOQUEIA.
#
set -euo pipefail

input="$(cat)"

cmd="$(printf '%s' "$input" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print(""); sys.exit(0)
print(d.get("tool_input", {}).get("command", "") or "")
' 2>/dev/null || true)"

norm="$(printf '%s' "$cmd" | tr -s '[:space:]' ' ')"
[ -z "$norm" ] && exit 0

# --- Escopo: descobrir o repo alvo e so atuar no altea-pay de producao ---
# Se o comando tem um "cd <path>" no inicio, usa esse path; senao usa o CWD.
target_dir="$PWD"
cd_path="$(printf '%s' "$norm" | grep -oE 'cd +[^ &;|]+' | head -1 | sed -E 's/^cd +//' || true)"
if [ -n "$cd_path" ]; then
  case "$cd_path" in
    "~"*) cd_path="${HOME}${cd_path#\~}" ;;
  esac
  target_dir="$cd_path"
fi
remote_url="$(git -C "$target_dir" remote get-url origin 2>/dev/null || echo '')"
repo_path="$(printf '%s' "$remote_url" | sed -E 's#\.git$##; s#.*[:/]([^/]+/[^/]+)$#\1#')"

# Fora do repo de producao, o guard nao interfere. Aceita o nome NOVO
# (BeAltea/alteapay) e o ANTIGO (BeAltea/altea-pay, ainda valido via redirect do
# GitHub) para nao perder a protecao durante/apos o rename do repositorio.
case "$repo_path" in
  BeAltea/alteapay|BeAltea/altea-pay) ;;
  *) exit 0 ;;
esac
# --- A partir daqui, alvo confirmado = repo de producao (alteapay) ---

block() {
  echo "BLOQUEADO pelo guard de main (altea-pay): $1" >&2
  echo "Comando recusado: $cmd" >&2
  echo "Motivo: a branch main de producao e intocavel. Trabalhe em feature/roadmap-v1." >&2
  exit 2
}

# Force-push em qualquer branch do altea-pay (nunca permitido).
if printf '%s' "$norm" | grep -Eiq 'git +push.*(--force-with-lease|--force|-f)( |$|=)'; then
  block "force-push nao e permitido"
fi

# Delete da branch main EXATA (local).
if printf '%s' "$norm" | grep -Eiq 'git +branch +-(d|D) +main( |$)'; then
  block "delete da branch main"
fi

# Push: delete remoto da main EXATA.
if printf '%s' "$norm" | grep -Eiq 'git +push +[^|;&]*(--delete|-d) +main( |$)'; then
  block "delete remoto da branch main"
fi
# Push: refspec terminando em :main EXATA (ex.: HEAD:main).
if printf '%s' "$norm" | grep -Eiq 'git +push +[^|;&]*:main( |$)'; then
  block "push para refspec :main"
fi
# Push: main EXATA como destino (delimitada por espaco ou "/", nunca main-* / main2).
if printf '%s' "$norm" | grep -Eiq 'git +push +[^|;&]*( |/)main( |$)'; then
  block "push mirando a branch main"
fi

# Push sem destino enquanto HEAD esta em main (evita push acidental por tracking).
if printf '%s' "$norm" | grep -Eiq 'git +push( |$)'; then
  cur="$(git -C "$target_dir" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
  if [ "$cur" = "main" ]; then
    block "push a partir da branch main (HEAD em main)"
  fi
fi

exit 0
