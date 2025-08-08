import * as BUI from "@thatopen/ui";
import { appIcons, sidebarItems } from "../../globals";

export interface GridSidebarState {
  grid: BUI.Grid<any, any>;
  compact: boolean;
  layoutIcons: Record<string, string>;
}

export const gridSidebarTemplate: BUI.StatefullComponent<GridSidebarState> = (
  state,
  update,
) => {
  const { compact } = state;

  const onToggleCompact = () => {
    update({ compact: !state.compact });
  };

  const onSidebarItemClick = (route: string) => {
    // Handle navigation or action based on route
    console.log(`Navigating to: ${route}`);
    // You can implement actual navigation logic here
  };

  return BUI.html`
  <div style="display: flex; flex-direction: column; justify-content: space-between; align-items: center; border-right: 1px solid var(--bim-ui_bg-contrast-40); padding: 0.5rem; background-color: var(--bim-ui_bg-contrast-10);">
    <div class="sidebar">
      ${sidebarItems.map((item) => {
    const icon = appIcons[item.icon as keyof typeof appIcons];
    return BUI.html`
          <bim-button 
            @click=${() => onSidebarItemClick(item.route)} 
            ?label-hidden=${compact} 
            icon=${icon} 
            label=${item.label}
            style="margin-bottom: 0.125rem; width: 100%; justify-content: ${compact ? 'center' : 'flex-start'}; padding: 0.25rem 0.5rem;"
          ></bim-button> 
        `;
  })}
    </div>
    <bim-button 
      ?label-hidden=${compact} 
      label="Collapse" 
      style="width: fit-content; flex: 0; background-color: transparent; border-radius: ${compact ? "100%" : "0"}" 
      icon=${compact ? appIcons.RIGHT : appIcons.LEFT} 
      @click=${onToggleCompact}
    ></bim-button>
  </div>
`;
};
