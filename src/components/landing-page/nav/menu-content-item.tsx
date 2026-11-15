import React from "react";
import { TextMorph } from "torph/react";

interface IProps {
  title: string;
  description: string;
  onHover?: () => void;
}

const MORPH = { scale: false, duration: 320 } as const;

export function MenuContentItem(props: IProps) {
  const { title, description, onHover } = props;

  return (
    <div
      onPointerEnter={onHover}
      className="group p-2 flex items-center rounded-[8px] text-left cursor-pointer hover:bg-[#F5F5F5]"
    >
      <div className="flex items-center gap-2 flex-1">
        <div className="w-8 h-8 rounded-[6px] bg-[#F1F1F1] shadow-[0_0_0_0.5px_#0000000f,0_1px_2px_-1px_#0000001a]"></div>
        <div className="flex flex-col gap-1 flex-1">
          <div className="h-4 relative">
            <p className="text-[#262626] font-medium group-hover:text-[#0A0A0A] text-13 leading-4 tracking-[-0.56%] font-inter-display transition-colors duration-150 flex-1 absolute top-0 left-0">
              <TextMorph {...MORPH}>{title}</TextMorph>
            </p>
          </div>

          <p className="text-[#737373] font-medium text-11 leading-3 tracking-[-0.56%] font-inter-display flex-1">
            <TextMorph {...MORPH}>{description}</TextMorph>
          </p>
        </div>
      </div>
    </div>
  );
}
