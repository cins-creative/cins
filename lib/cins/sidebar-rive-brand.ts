import type { Rive, StateMachineInput } from "@rive-app/canvas";
import { Alignment, Fit, Layout } from "@rive-app/canvas";

/** Sidebar brand — Rive `LogCINs.riv` (public/rive/LogoCINs.riv). */
export const RIVE_LOGO_SRC = "/rive/LogoCINs.riv";

/** Đọc từ `rive.contents` của file gốc. */
export const RIVE_ARTBOARD = "Artboard";
export const RIVE_STATE_MACHINE = "State Machine 1";
export const RIVE_EXPANDED_INPUT = "Boolean 1";
export const RIVE_TRIGGER_INPUT = "Trigger 1";

/** Rail thu gọn — icon vuông căn giữa. */
export const LOGO_LAYOUT_COLLAPSED = new Layout({
  fit: Fit.Contain,
  alignment: Alignment.Center,
});

/** Sidebar mở — logo full chiều cao vùng brand, căn giữa ngang. */
export const LOGO_LAYOUT_EXPANDED = new Layout({
  fit: Fit.FitHeight,
  alignment: Alignment.Center,
  layoutScaleFactor: 1.28,
});

type LogoSidebarInputs = {
  booleanInput?: StateMachineInput | null;
  triggerInput?: StateMachineInput | null;
};

function getStateMachineInput(
  rive: Rive,
  inputName: string,
): StateMachineInput | null {
  return (
    rive
      .stateMachineInputs(RIVE_STATE_MACHINE)
      ?.find((input) => input.name === inputName) ?? null
  );
}

export function syncLogoSidebarLayout(rive: Rive, expanded: boolean): void {
  rive.layout = expanded ? LOGO_LAYOUT_EXPANDED : LOGO_LAYOUT_COLLAPSED;
  rive.resizeToCanvas();
}

/**
 * File `LogCINs.riv`:
 * - Animations: State 1 (icon), State 2 (transition), State 3 (logo mở)
 * - SM inputs: Boolean 1 (false = thu gọn), Trigger 1 (fire để chạy transition)
 */
export function applyLogoSidebarExpanded(
  rive: Rive,
  expanded: boolean,
  inputs: LogoSidebarInputs = {},
  options: { fireTrigger?: boolean } = {},
): void {
  const { fireTrigger = true } = options;

  const booleanInput =
    inputs.booleanInput ?? getStateMachineInput(rive, RIVE_EXPANDED_INPUT);
  const triggerInput =
    inputs.triggerInput ?? getStateMachineInput(rive, RIVE_TRIGGER_INPUT);

  syncLogoSidebarLayout(rive, expanded);

  if (booleanInput) {
    booleanInput.value = expanded;
  }

  rive.play(RIVE_STATE_MACHINE);

  if (fireTrigger && triggerInput) {
    triggerInput.fire();
  }

  rive.resizeToCanvas();
  rive.startRendering();
}
