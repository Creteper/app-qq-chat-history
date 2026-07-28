import type { CSSProperties, HTMLAttributes } from "react";

import arrowDownMiniIcon from "@/assets/qq-toolbar/arrow_down_mini_16.svg";
import closeIcon from "@/assets/qq-toolbar/close_16.svg";
import computerPhoneIcon from "@/assets/qq-toolbar/computer_phone_24.svg";
import maximizeIcon from "@/assets/qq-toolbar/max_16.svg";
import minimizeIcon from "@/assets/qq-toolbar/minimize_16.svg";
import moreIcon from "@/assets/qq-toolbar/more_24.svg";
import overcastIcon from "@/assets/qq-toolbar/nav_overcast_normal_24.svg";
import newDialogueIcon from "@/assets/qq-toolbar/new_dialogue_24.svg";
import phoneIcon from "@/assets/qq-toolbar/phone_24.svg";
import qqLogoIcon from "@/assets/qq-toolbar/qq_logo_24.svg";
import shareScreenIcon from "@/assets/qq-toolbar/share_screen_24.svg";
import switchPanelLeftIcon from "@/assets/qq-toolbar/switch_panel_left_16.svg";
import videoIcon from "@/assets/qq-toolbar/video_24.svg";
import { cn } from "@/lib/utils";

type QQToolbarIconProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
>;

type QQIconMaskStyle = CSSProperties & {
  "--qq-original-icon": string;
};

function QQOriginalIcon({
  className,
  size,
  src,
  style,
  ...props
}: QQToolbarIconProps & {
  size: 16 | 24;
  src: string;
}) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={cn("qq-original-icon", className)}
      data-size={size}
      style={
        {
          ...style,
          "--qq-original-icon": `url("${src}")`,
        } as QQIconMaskStyle
      }
    />
  );
}

export function QQPhoneIcon(props: QQToolbarIconProps) {
  return <QQOriginalIcon {...props} size={24} src={phoneIcon} />;
}

export function QQLogoIcon(props: QQToolbarIconProps) {
  return <QQOriginalIcon {...props} size={24} src={qqLogoIcon} />;
}

export function QQVideoIcon(props: QQToolbarIconProps) {
  return <QQOriginalIcon {...props} size={24} src={videoIcon} />;
}

export function QQShareScreenIcon(props: QQToolbarIconProps) {
  return <QQOriginalIcon {...props} size={24} src={shareScreenIcon} />;
}

export function QQComputerPhoneIcon(props: QQToolbarIconProps) {
  return <QQOriginalIcon {...props} size={24} src={computerPhoneIcon} />;
}

export function QQArrowDownMiniIcon(props: QQToolbarIconProps) {
  return <QQOriginalIcon {...props} size={16} src={arrowDownMiniIcon} />;
}

export function QQNewDialogueIcon(props: QQToolbarIconProps) {
  return <QQOriginalIcon {...props} size={24} src={newDialogueIcon} />;
}

export function QQMoreIcon(props: QQToolbarIconProps) {
  return <QQOriginalIcon {...props} size={24} src={moreIcon} />;
}

export function QQOvercastIcon(props: QQToolbarIconProps) {
  return <QQOriginalIcon {...props} size={24} src={overcastIcon} />;
}

export function QQSwitchPanelLeftIcon(props: QQToolbarIconProps) {
  return <QQOriginalIcon {...props} size={16} src={switchPanelLeftIcon} />;
}

export function QQMinimizeIcon(props: QQToolbarIconProps) {
  return <QQOriginalIcon {...props} size={16} src={minimizeIcon} />;
}

export function QQMaximizeIcon(props: QQToolbarIconProps) {
  return <QQOriginalIcon {...props} size={16} src={maximizeIcon} />;
}

export function QQCloseIcon(props: QQToolbarIconProps) {
  return <QQOriginalIcon {...props} size={16} src={closeIcon} />;
}
