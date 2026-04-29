import { Handle, Position, type HandleProps } from "@xyflow/react";
import type { CSSProperties } from "react";

export type HandleVariant = "a" | "b";

const RESET_STYLE: CSSProperties = {
  background: "transparent",
  border: "none",
  width: "auto",
  height: "auto",
  minWidth: 0,
  minHeight: 0,
};

type Props = Omit<HandleProps, "children"> & {
  variant?: HandleVariant;
};

const VARIANT_B_TRANSFORMS: Record<Position, string> = {
  [Position.Top]: "translate(-50%, -100%)",
  [Position.Bottom]: "translate(-50%, 100%)",
  [Position.Left]: "translate(-100%, -50%)",
  [Position.Right]: "translate(100%, -50%)",
};

export function CustomHandle({ variant = "b", style, ...props }: Props) {
  const offsetStyle =
    variant === "b"
      ? { transform: VARIANT_B_TRANSFORMS[props.position] }
      : null;

  return (
    <Handle {...props} style={{ ...RESET_STYLE, ...offsetStyle, ...style }}>
      {variant === "a" ? <VariantA /> : <VariantB position={props.position} />}
    </Handle>
  );
}

function VariantA() {
  return (
    <div className="p-0.5 border-[0.5px] border-ring rounded-full bg-primary">
      <div className="size-1 rounded-sm bg-ring"></div>
    </div>
  );
}

const VARIANT_B_ROUNDED: Record<Position, string> = {
  [Position.Top]: "rounded-t-[2.3px]",
  [Position.Bottom]: "rounded-b-[2.3px]",
  [Position.Left]: "rounded-l-[2.3px]",
  [Position.Right]: "rounded-r-[2.3px]",
};

function VariantB({ position }: { position: Position }) {
  return (
    <div
      className={`bg-primary ${VARIANT_B_ROUNDED[position]} size-3 flex items-center justify-center`}
      style={{
        boxShadow:
          "inset 0px 1.17px 2.33px 0px #00000040, inset 0.18px 0.18px 0.58px 0px #4080FD, inset -0.18px -0.18px 0.58px 0px #4080FD",
      }}
    >
      <div className="bg-background-2 rounded-full size-[3.5px]" />
    </div>
  );
}
