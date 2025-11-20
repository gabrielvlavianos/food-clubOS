const XLSX = require('xlsx');

const columns = [
  'Nome', 'WhatsApp', 'Email', 'Telefone', 'Data de Nascimento', 'Gênero',
  'Nome do Nutricionista', 'Telefone do Nutricionista', 'Objetivo Principal',
  'Alergias', 'Restrições Alimentares', 'Condições Clínicas', 'Uso de Medicamentos',
  'Altura (cm)', 'Peso Atual (kg)', 'Peso Meta (kg)', 'Percentual de Gordura',
  'Massa Muscular', 'Rotina de Trabalho', 'Frequência Aeróbico', 'Intensidade Aeróbico',
  'Frequência Musculação', 'Intensidade Musculação', 'Refeições por Dia', 'Notas sobre Dieta',
  'Carboidratos Almoço (g)', 'Proteínas Almoço (g)', 'Gorduras Almoço (g)',
  'Carboidratos Jantar (g)', 'Proteínas Jantar (g)', 'Gorduras Jantar (g)', 'Ativo',
  'Segunda-Feira Almoço', 'Horário Seg Almoço', 'Endereço Seg Almoço',
  'Segunda-Feira Jantar', 'Horário Seg Jantar', 'Endereço Seg Jantar',
  'Terça-Feira Almoço', 'Horário Ter Almoço', 'Endereço Ter Almoço',
  'Terça-Feira Jantar', 'Horário Ter Jantar', 'Endereço Ter Jantar',
  'Quarta-Feira Almoço', 'Horário Qua Almoço', 'Endereço Qua Almoço',
  'Quarta-Feira Jantar', 'Horário Qua Jantar', 'Endereço Qua Jantar',
  'Quinta-Feira Almoço', 'Horário Qui Almoço', 'Endereço Qui Almoço',
  'Quinta-Feira Jantar', 'Horário Qui Jantar', 'Endereço Qui Jantar',
  'Sexta-Feira Almoço', 'Horário Sex Almoço', 'Endereço Sex Almoço',
  'Sexta-Feira Jantar', 'Horário Sex Jantar', 'Endereço Sex Jantar'
];

const testData = [
  [
    'Teste Cliente 1', '+5511999999999', 'teste1@email.com', '+5511988888888',
    '1990-01-15', 'M', 'Dra. Maria Silva', '+5511977777777', 'Ganho de massa',
    'Nenhuma', 'Sem glúten', 'Nenhuma', 'Nenhum',
    175, 80, 85, 15, 40, 'Escritório', '3x por semana', 'Moderada',
    '5x por semana', 'Alta', 6, 'Gosta de frango',
    50, 40, 15, 45, 35, 12, 'Sim',
    'Sim', '12:00', 'Rua Teste A, 123', 'Não', '', '',
    'Sim', '12:00', 'Rua Teste A, 123', 'Não', '', '',
    'Sim', '12:00', 'Rua Teste A, 123', 'Não', '', '',
    'Sim', '12:00', 'Rua Teste A, 123', 'Não', '', '',
    'Sim', '12:00', 'Rua Teste A, 123', 'Não', '', ''
  ],
  [
    'Teste Cliente 2', '+5511988888888', 'teste2@email.com', '+5511977777777',
    '1985-05-20', 'F', 'Dr. João Santos', '+5511966666666', 'Perda de peso',
    'Lactose', 'Vegetariana', 'Hipertensão', 'Anti-hipertensivo',
    165, 75, 65, 28, 30, 'Home office', '2x por semana', 'Leve',
    '3x por semana', 'Moderada', 5, 'Prefere legumes',
    40, 35, 10, 35, 30, 10, 'Sim',
    'Sim', '11:30', 'Av Teste B, 456', 'Sim', '19:00', 'Av Teste B, 456',
    'Sim', '11:30', 'Av Teste B, 456', 'Sim', '19:00', 'Av Teste B, 456',
    'Sim', '11:30', 'Av Teste B, 456', 'Sim', '19:00', 'Av Teste B, 456',
    'Sim', '11:30', 'Av Teste B, 456', 'Sim', '19:00', 'Av Teste B, 456',
    'Sim', '11:30', 'Av Teste B, 456', 'Sim', '19:00', 'Av Teste B, 456'
  ]
];

const worksheet = XLSX.utils.aoa_to_sheet([columns, ...testData]);

const colWidths = columns.map(() => ({ wch: 20 }));
worksheet['!cols'] = colWidths;

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

XLSX.writeFile(workbook, 'arquivo-teste-importacao.xlsx');

console.log('✅ Arquivo de teste criado: arquivo-teste-importacao.xlsx');
console.log('📊 2 clientes de teste criados');
console.log('📍 Total de colunas:', columns.length);
