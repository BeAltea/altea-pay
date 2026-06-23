#!/usr/bin/env bash
#
# pre-bash-guard.sh
# Hook PreToolUse do Claude Code: bloqueia qualquer operacao git que mire a
# branch `main`. E uma defesa em profundidade: a garantia autoritativa e a
# branch protection (PR obrigatorio) no GitHub. Este hook impede que um agente
# autonomo sequer tente push/force/delete na main localmente.
#
# Mecanismo: PreToolUse recebe um JSON no stdin com { tool_name, tool_input }.
# Saida com exit code 2 BLOQUEIA a tool e devolve o stderr ao Claude.
#
set -euo pipefail

input="$(cat)"

# Extrai o comando bash de tool_input.command. Usa python3 (presente no
# container/macOS). Se python3 nao existir, troque por jq.
cmd="$(printf '%s' "$input" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print(""); sys.exit(0)
print(d.get("tool_input", {}).get("command", "") or "")
' 2>/dev/null || true)"

# Normaliza espacos para casar regex de forma estavel.
norm="$(printf '%s' "$cmd" | tr -s '[:space:]' ' ')"

block() {
  echo "BLOQUEADO pelo guard de main: $1" >&2
  echo "Comando recusado: $cmd" >&2
  echo "Motivo: a branch main de producao e intocavel. Trabalhe em feature/roadmap-v1." >&2
  exit 2
}

# Sem comando, nada a verificar.
[ -z "$norm" ] && exit 0

# Force-push em qualquer branch (nao permitido em nenhuma circunstancia).
if printf '%s' "$norm" | grep -Eiq 'git +push.*(--force-with-lease|--force|-f)( |$|=)'; then
  block "force-push nao e permitido"
fi

# Delete da branch main (local).
if printf '%s' "$norm" | grep -Eiq 'git +branch +-(d|D) +main( |$)'; then
  block "delete da branch main"
fi

# Delete remoto da main.
if printf '%s' "$norm" | grep -Eiq 'git +push +[^|;&]*--delete +main( |$)'; then
  block "delete remoto da branch main"
fi
if printf '%s' "$norm" | grep -Eiq 'git +push +[^|;&]*:main( |$)'; then
  block "push para refspec main"
fi

# Push explicito mirando main como destino (main EXATA, nunca main-* / main2).
# Token "main" delimitado por espaco ou "/" (refspec) e fim/espaco a direita, de
# modo que main-2, main-3, main-main, main-branch-update, main2 nao casem.
if printf '%s' "$norm" | grep -Eiq 'git +push +[^|;&]*( |/)main( |$)'; then
  block "push mirando a branch main"
fi

# Push sem destino enquanto HEAD esta em main (evita push acidental por tracking).
if printf '%s' "$norm" | grep -Eiq 'git +push( |$)'; then
  cur="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
  if [ "$cur" = "main" ]; then
    block "push a partir da branch main (HEAD em main)"
  fi
fi

exit 0
