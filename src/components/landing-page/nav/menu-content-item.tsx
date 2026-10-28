import React from "react";
import { TextMorph } from "torph/react";

interface IProps {
  title: string;
  description: string;
}

const MORPH = { scale: false, duration: 320 } as const;

export function MenuContentItem(props: IProps) {
  const { title, description } = props;

  return (
    <div className="group p-2 flex items-center rounded-[8px] text-left cursor-pointer hover:bg-[#D4ECFC]/50">
      <div className="flex items-center gap-2 flex-1">
        <div className="w-8 h-8 rounded-[6px] bg-[#D4ECFC] shadow-[0_0_0_0.5px_#093BDC1f,0_1px_2px_-1px_#093BDC40]"></div>
        <div className="flex flex-col gap-1 flex-1">
          <div className="h-4 relative">
            <p className="text-[#2E82FF] group-hover:text-[#0066FF] text-13 leading-4 tracking-[-0.56%] font-inter-display transition-colors duration-150 flex-1 absolute top-0 left-0">
              <TextMorph {...MORPH}>{title}</TextMorph>
            </p>
          </div>

          <p className="text-[#3A89FF] text-[11px] leading-3 tracking-[-0.56%] font-inter-display flex-1">
            <TextMorph {...MORPH}>{description}</TextMorph>
          </p>
        </div>
      </div>
    </div>
  );
}
