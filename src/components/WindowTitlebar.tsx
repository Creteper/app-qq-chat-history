import { useCallback, useEffect, useState, type MouseEvent } from "react"
import { isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { MessageCircleMoreIcon } from "lucide-react"

import {
  QQCloseIcon,
  QQMaximizeIcon,
  QQMinimizeIcon,
  QQOvercastIcon,
  QQSwitchPanelLeftIcon,
} from "@/components/QQToolbarIcons"
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type WindowTitlebarProps = {
  avatarUrl?: string
  className?: string
  displayName?: string
  onMaximizedChange?: (isMaximized: boolean) => void
  signature?: string
  weather?: string
}

const DEFAULT_AVATAR = ""

function isWindowControl(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("[data-window-control]") !== null
  )
}

export function WindowTitlebar({
  avatarUrl = DEFAULT_AVATAR,
  className,
  displayName = "sAmuel",
  onMaximizedChange,
  signature = "编辑个性签名",
  weather = "阴",
}: WindowTitlebarProps) {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle("window-maximized", maximized)
    document.documentElement.dataset.windowMaximized = String(maximized)
    onMaximizedChange?.(maximized)
  }, [maximized, onMaximizedChange])

  useEffect(
    () => () => {
      document.documentElement.classList.remove("window-maximized")
      delete document.documentElement.dataset.windowMaximized
    },
    []
  )

  useEffect(() => {
    if (!isTauri()) {
      return
    }

    const appWindow = getCurrentWindow()
    let disposed = false
    let unlisten: (() => void) | undefined

    const syncMaximizedState = async () => {
      const nextMaximized = await appWindow.isMaximized()
      if (!disposed) {
        setMaximized(nextMaximized)
      }
    }

    void syncMaximizedState().catch(() => undefined)
    void appWindow
      .onResized(() => {
        void syncMaximizedState().catch(() => undefined)
      })
      .then((stopListening) => {
        if (disposed) {
          stopListening()
        } else {
          unlisten = stopListening
        }
      })
      .catch(() => undefined)

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [])

  const toggleMaximize = useCallback(() => {
    if (!isTauri()) {
      setMaximized((current) => !current)
      return
    }

    const appWindow = getCurrentWindow()
    void appWindow
      .toggleMaximize()
      .then(() => appWindow.isMaximized())
      .then(setMaximized)
      .catch(() => undefined)
  }, [])

  const startDragging = useCallback((event: MouseEvent<HTMLElement>) => {
    if (
      event.button !== 0 ||
      event.detail !== 1 ||
      isWindowControl(event.target) ||
      !isTauri()
    ) {
      return
    }

    void getCurrentWindow().startDragging().catch(() => undefined)
  }, [])

  const minimize = useCallback(() => {
    if (isTauri()) {
      void getCurrentWindow().minimize().catch(() => undefined)
    }
  }, [])

  const close = useCallback(() => {
    if (isTauri()) {
      void getCurrentWindow().close().catch(() => undefined)
    }
  }, [])

  return (
    <TooltipProvider delay={350}>
      <header
        aria-label="QQ 窗口标题栏"
        className={cn(
          "window-titlebar",
          maximized && "is-maximized",
          className
        )}
        onDoubleClick={(event) => {
          if (!isWindowControl(event.target)) {
            toggleMaximize()
          }
        }}
        onMouseDown={startDragging}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-label="QQ"
            className="flex shrink-0 items-center gap-1 font-semibold"
          >
            <MessageCircleMoreIcon
              aria-hidden="true"
              className="size-5 fill-current"
            />
            <span>QQ</span>
          </div>

          <Avatar className="size-9">
            <AvatarImage
              alt={`${displayName} 的头像`}
              referrerPolicy="no-referrer"
              src={avatarUrl}
            />
            <AvatarFallback>
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
            <AvatarBadge className="titlebar-online-badge" />
          </Avatar>

          <div className="flex min-w-0 items-baseline gap-2">
            <span className="max-w-40 truncate text-base font-semibold">
              {displayName}
            </span>
            <span className="max-w-56 truncate text-sm text-foreground/45">
              {signature}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div
            className="mr-4 flex items-center gap-2 text-sm text-foreground/65"
          >
            <QQOvercastIcon />
            <span>{weather}</span>
          </div>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-disabled="true"
                  aria-label="切换面板"
                  className="window-control window-control--panel"
                  data-window-control
                  size="icon-lg"
                  variant="ghost"
                />
              }
            >
              <QQSwitchPanelLeftIcon data-icon="inline-start" />
            </TooltipTrigger>
            <TooltipContent side="bottom">切换面板</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="最小化"
                  className="window-control"
                  data-window-control
                  onClick={minimize}
                  size="icon-lg"
                  variant="ghost"
                />
              }
            >
              <QQMinimizeIcon data-icon="inline-start" />
            </TooltipTrigger>
            <TooltipContent side="bottom">最小化</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={maximized ? "还原" : "最大化"}
                  className="window-control"
                  data-window-control
                  onClick={toggleMaximize}
                  size="icon-lg"
                  variant="ghost"
                />
              }
            >
              <QQMaximizeIcon data-icon="inline-start" />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {maximized ? "还原" : "最大化"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="关闭"
                  className="window-control window-control--close"
                  data-window-control
                  onClick={close}
                  size="icon-lg"
                  variant="ghost"
                />
              }
            >
              <QQCloseIcon data-icon="inline-start" />
            </TooltipTrigger>
            <TooltipContent side="bottom">关闭</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  )
}

export default WindowTitlebar
