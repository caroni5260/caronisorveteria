import type { Data } from './domain';

export function orderIssues(data: Data, source: string, destination: string, amounts: Record<string,number>, due: string, ready: string): string[] {
  const issues: string[] = [];
  const origin = (data.referenceUnits || data.units).find(u => u.id === source);
  const target = data.units.find(u => u.id === destination);
  if (!origin) issues.push('Selecione a unidade de origem: quem vai fornecer os produtos.');
  else if (!origin.active) issues.push(`A unidade ${origin.name} está inativa. Ative-a em Cadastros → Unidades para usá-la como origem.`);
  if (!target) issues.push('Selecione a unidade de destino: quem vai receber os produtos.');
  else if (!target.active) issues.push(`A unidade ${target.name} está inativa. Ative-a em Cadastros → Unidades.`);
  if (source && source === destination) issues.push('Origem e destino precisam ser diferentes. Escolha a unidade fornecedora no campo Origem.');
  if (!Object.values(amounts).some(n => n > 0)) issues.push('Selecione pelo menos 1 produto com quantidade maior que zero.');
  if (Object.values(amounts).some(n => !Number.isFinite(n) || n < 0 || n > 1000000)) issues.push('Informe quantidades válidas entre 0 e 1.000.000.');
  if (!due || !Number.isFinite(new Date(due).getTime())) issues.push('Informe uma data e hora válidas para a entrega.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(ready)) issues.push('Informe o horário em que os produtos devem estar prontos.');
  if (origin?.active && source !== destination) {
    const incompatible = data.products.filter(p => amounts[p.id] > 0 && data.sectors.find(s => s.id === p.sectorId)?.unitId !== source);
    if (incompatible.length) issues.push(`O setor responsável por ${incompatible[0].name} não pertence à origem selecionada. Confira o setor no cadastro do produto.`);
  }
  return issues;
}
