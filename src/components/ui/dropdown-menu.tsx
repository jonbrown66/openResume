import * as React from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';

export function DropdownMenu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root modal={false} {...props} />;
}

export function DropdownMenuTrigger(props: React.ComponentProps<typeof MenuPrimitive.Trigger>) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

export function DropdownMenuContent({
  align = 'start', alignOffset = 0, side = 'bottom', sideOffset = 8, className, ...props
}: MenuPrimitive.Popup.Props & Pick<MenuPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner className="isolate z-[240] outline-none" align={align} alignOffset={alignOffset}
        side={side} sideOffset={sideOffset} collisionPadding={12}>
        <MenuPrimitive.Popup data-slot="dropdown-menu-content"
          className={cn('app-ui ui-select-overlay ui-menu ui-dropdown-popup', className)} {...props} />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return <MenuPrimitive.Item data-slot="dropdown-menu-item" className={cn('ui-menu-item', className)} {...props} />;
}
