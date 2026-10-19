import { useState, type ReactNode, type RefObject } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';

interface MenuAction {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  opensDialog?: boolean;
}
export interface HeaderMoreMenuProps {
  label: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
  actions: MenuAction[];
}

export function HeaderMoreMenu({ label, triggerRef, onOpen, actions }: HeaderMoreMenuProps) {
  const [opensDialog, setOpensDialog] = useState(false);
  return <DropdownMenu onOpenChange={open => { if (open) { setOpensDialog(false); onOpen(); } }}>
    <DropdownMenuTrigger ref={triggerRef} className="app-control flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2" aria-label={label}>
      <MoreHorizontal size={18} />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" aria-label={label} className="w-56" finalFocus={opensDialog ? false : undefined}>
      {actions.map(action => <DropdownMenuItem key={action.label}
        render={action.href ? <a href={action.href} target="_blank" rel="noreferrer" /> : <button type="button" />}
        nativeButton={!action.href} onClick={() => { setOpensDialog(Boolean(action.opensDialog)); action.onClick?.(); }}>
        {action.icon}<span>{action.label}</span>
      </DropdownMenuItem>)}
    </DropdownMenuContent>
  </DropdownMenu>;
}
