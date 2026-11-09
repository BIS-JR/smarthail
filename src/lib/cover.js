import { api } from '@/api/client';

/**
 * Executa um comando na capa. O CoverStatus funciona como log de ações:
 * cada comando cria um registro novo e o estado atual é sempre o mais recente.
 *
 * Hoje o comando é simulado localmente. Quando houver o hardware/API da capa,
 * a chamada ao dispositivo entra aqui, antes do `create`.
 */
const BATTERY_COST = { inflate: 3, deflate: 1, check: 0, emergency_deploy: 5 };

export const coverToastTitles = {
  inflate: 'Capa inflada',
  deflate: 'Capa desinflada',
  check: 'Verificação concluída',
  emergency_deploy: 'Emergência acionada — capa inflada',
};

export async function runCoverAction(action, current) {
  const battery = current?.battery_level ?? 80;
  const cost = BATTERY_COST[action];
  if (cost > 0 && battery - cost < 5) {
    throw new Error('Bateria insuficiente para executar o comando.');
  }

  await new Promise((r) => setTimeout(r, 700)); // tempo de resposta do dispositivo

  const inflated = action === 'inflate' || action === 'emergency_deploy'
    ? true
    : action === 'deflate' ? false : Boolean(current?.is_inflated);

  return api.entities.CoverStatus.create({
    timestamp: new Date().toISOString(),
    is_inflated: inflated,
    magnets_status: current?.magnets_status ?? 'all_attached',
    integrity: current?.integrity ?? 'perfect',
    battery_level: Math.max(0, battery - cost),
    last_action: action,
    action_by: 'app',
  });
}
