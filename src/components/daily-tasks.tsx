'use client';

import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, ShoppingBag } from 'lucide-react';
import type { DailyTask } from '@/lib/daily-tasks';

export default function DailyTasks({ tasks, run }: { tasks: DailyTask[]; run: (task: DailyTask) => void }) {
  const pending = tasks.filter(t => t.status !== 'done').length;
  return <section className="panel daily-tasks" aria-label="Tarefas de hoje">
    <div className="section-title"><div><p className="eyebrow">NÃO DEIXE PARA DEPOIS</p><h2>Tarefas de hoje</h2></div><span className={`tag ${pending ? 'warning' : 'success'}`}>{pending ? `${pending} pendente(s)` : 'Tudo em dia'}</span></div>
    <p className="daily-intro">Confira os pedidos previstos nas rotinas e a contagem diária de cada unidade.</p>
    {!tasks.length && <p className="muted">Cadastre produtos e rotinas para acompanhar as tarefas da unidade.</p>}
    {tasks.map(task => <div key={task.id} className={`daily-task ${task.status}`}>
      <span className="daily-icon">{task.status === 'done' ? <CheckCircle2 size={21}/> : task.status === 'overdue' ? <AlertTriangle size={21}/> : task.kind === 'count' ? <ClipboardCheck size={21}/> : <ShoppingBag size={21}/>}</span>
      <div className="grow"><div className="daily-title"><strong>{task.title}</strong><span className={`tag ${task.status === 'done' ? 'success' : task.status === 'overdue' ? 'warning' : 'blue'}`}>{task.status === 'done' ? 'Concluído' : task.status === 'overdue' ? 'Horário ultrapassado' : 'Pendente'}</span></div><small>{task.unitName}</small><p>{task.description}</p></div>
      {task.status === 'done' && !task.orderId ? <span className="daily-finished"><CheckCircle2 size={16}/> Hoje</span> : <button className={`button compact ${task.status === 'overdue' ? 'primary' : 'secondary'}`} onClick={() => run(task)}>{task.orderId ? 'Ver pedido' : task.kind === 'count' ? 'Fazer contagem' : 'Fazer pedido'}</button>}
    </div>)}
    <div className="daily-foot"><Clock3 size={14}/> Horários no fuso deste dispositivo. Um pedido com outro prazo de entrega não conclui esta rotina.</div>
  </section>;
}
