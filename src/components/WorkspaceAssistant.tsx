import { useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { deferredComponent, useIdlePreload } from '@/lib/deferredComponent';
import type { AssistantWidgetProps } from '@/components/AssistantWidget';

const AssistantWidget = deferredComponent<AssistantWidgetProps>(
  () => import('@/components/AssistantWidget').then(module => ({ default: module.AssistantWidget })),
  props => <div className="app-ui ui-floating-tools pointer-events-none fixed inset-x-2 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] flex justify-end sm:inset-x-auto sm:bottom-6 sm:right-6">
    <button type="button" aria-label={props.lang === 'zh' ? '正在打开 AI 助手' : 'Opening AI assistant'} aria-busy="true" disabled className="app-primary inline-flex h-14 w-14 items-center justify-center rounded-full">
      <Loader2 size={22} className="animate-spin" />
    </button>
  </div>,
);
const assistantPreloads = [AssistantWidget.preload];

export function WorkspaceAssistant(props: Omit<AssistantWidgetProps, 'initiallyOpen'>) {
  const [launch, setLaunch] = useState<{ projectId: string; initiallyOpen: boolean } | null>(null);
  useIdlePreload(assistantPreloads);
  if (launch && launch.projectId !== props.projectId) {
    setLaunch({ projectId: props.projectId, initiallyOpen: false });
  }
  if (launch) return <AssistantWidget {...props} key={props.projectId}
    initiallyOpen={launch.projectId === props.projectId && launch.initiallyOpen} />;
  return <div className="app-ui ui-floating-tools pointer-events-none fixed inset-x-2 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] flex justify-end print:hidden sm:inset-x-auto sm:bottom-6 sm:right-6">
    <button id="assistant-launcher" type="button" aria-label={props.translations.assistantOpen}
      className="app-primary pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full"
      onClick={() => setLaunch({ projectId: props.projectId, initiallyOpen: true })}><Bot size={22} /></button>
  </div>;
}
