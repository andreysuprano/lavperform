#!/bin/bash

echo "================================"
echo "VERIFICAÇÃO DE TIMEZONE"
echo "================================"
echo ""

echo "1. Timezone do Sistema Operacional:"
date
echo ""

echo "2. Variável TZ:"
echo $TZ
echo ""

echo "3. Conteúdo de /etc/timezone:"
if [ -f /etc/timezone ]; then
    cat /etc/timezone
else
    echo "Arquivo não existe"
fi
echo ""

echo "4. Link simbólico /etc/localtime:"
if [ -L /etc/localtime ]; then
    ls -l /etc/localtime
else
    echo "Não é um link simbólico"
fi
echo ""

echo "5. Data em UTC:"
date -u
echo ""

echo "6. Teste Node.js:"
node -e "console.log('Timezone do Node.js:', process.env.TZ); console.log('Data atual:', new Date().toISOString()); console.log('Offset:', new Date().getTimezoneOffset());"
echo ""

echo "================================"
echo "✅ Se tudo estiver correto:"
echo "   - TZ deve ser 'UTC'"
echo "   - /etc/timezone deve conter 'UTC'"
echo "   - Offset deve ser 0"
echo "================================"
