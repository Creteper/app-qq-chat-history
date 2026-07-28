import type { ComponentType } from "react";

import {
  QQApplicationIcon,
  QQChannelIcon,
  QQContactIcon,
  QQDocsIcon,
  QQGameIcon,
  QQMailIcon,
  QQMenuIcon,
  QQMessageIcon,
  QQMobilePhoneIcon,
  QQMusicIcon,
  QQQZoneIcon,
  type QQNavigationIconProps,
} from "@/components/QQNavigationIcons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type AppView = "chat" | "settings";

type NavigationIndicator =
  | {
      kind: "count";
      count: number;
    }
  | {
      kind: "dot";
    };

type NavigationItem = {
  id: string;
  label: string;
  icon: ComponentType<QQNavigationIconProps>;
  indicator?: NavigationIndicator;
  view?: AppView;
};

const mainItems: NavigationItem[] = [
  { id: "message", label: "消息", icon: QQMessageIcon, view: "chat" },
  { id: "contact", label: "联系人", icon: QQContactIcon },
  {
    id: "qzone",
    label: "QQ空间",
    icon: QQQZoneIcon,
    indicator: { kind: "dot" },
  },
  {
    id: "channel",
    label: "频道",
    icon: QQChannelIcon,
    indicator: { kind: "dot" },
  },
  { id: "docs", label: "QQ文档", icon: QQDocsIcon },
  { id: "music", label: "QQ音乐", icon: QQMusicIcon },
  { id: "game", label: "游戏中心", icon: QQGameIcon },
  {
    id: "application",
    label: "应用",
    icon: QQApplicationIcon,
    indicator: { kind: "dot" },
  },
];

const utilityItems: NavigationItem[] = [
  {
    id: "mail",
    label: "QQ邮箱",
    icon: QQMailIcon,
    indicator: { kind: "dot" },
  },
  { id: "mobile", label: "我的手机", icon: QQMobilePhoneIcon },
  { id: "settings", label: "设置", icon: QQMenuIcon, view: "settings" },
];

type PrimaryNavigationProps = {
  messageUnreadCount: number;
  view: AppView;
  onViewChange: (view: AppView) => void;
};

function NavigationButton({
  item,
  active,
  indicator,
  onSelect,
}: {
  item: NavigationItem;
  active: boolean;
  indicator?: NavigationIndicator;
  onSelect?: () => void;
}) {
  const Icon = item.icon;
  const accessibleLabel =
    indicator?.kind === "count"
      ? `${item.label}，${indicator.count} 条未读消息`
      : indicator?.kind === "dot"
        ? `${item.label}，有新内容`
        : item.label;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-current={active ? "page" : undefined}
            aria-disabled={onSelect ? undefined : true}
            aria-label={accessibleLabel}
            className={cn("primary-nav__button", active && "is-active")}
            onClick={onSelect}
            size="icon-lg"
            variant="ghost"
          />
        }
      >
        <span className="primary-nav__icon-slot">
          <Icon active={active} className="primary-nav__icon size-6" />
          {indicator && (
            <Badge
              aria-hidden="true"
              className={cn(
                "primary-nav__indicator",
                indicator.kind === "dot" && "primary-nav__indicator--dot",
              )}
            >
              {indicator.kind === "count"
                ? indicator.count > 99
                  ? "99+"
                  : indicator.count
                : null}
            </Badge>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function PrimaryNavigation({
  messageUnreadCount,
  view,
  onViewChange,
}: PrimaryNavigationProps) {
  return (
    <nav className="primary-nav" aria-label="一级导航">
      <div className="primary-nav__group">
        {mainItems.map((item) => (
          <NavigationButton
            active={item.view === view}
            indicator={
              item.id === "message"
                ? messageUnreadCount > 0
                  ? { kind: "count", count: messageUnreadCount }
                  : undefined
                : item.indicator
            }
            item={item}
            key={item.id}
            onSelect={
              item.view ? () => onViewChange(item.view as AppView) : undefined
            }
          />
        ))}
      </div>

      <div className="primary-nav__group primary-nav__group--bottom">
        {utilityItems.map((item) => (
          <NavigationButton
            active={item.view === view}
            indicator={item.indicator}
            item={item}
            key={item.id}
            onSelect={
              item.view ? () => onViewChange(item.view as AppView) : undefined
            }
          />
        ))}
      </div>
    </nav>
  );
}
