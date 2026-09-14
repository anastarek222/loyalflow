import {
  CustomLoyaltyCard,
  type CustomLoyaltyCardProps,
} from "@/components/custom-loyalty-card";
import {
  StandardLoyaltyCard,
  type StandardLoyaltyCardProps,
} from "@/components/standard-loyalty-card";
import { cardDesignMode } from "@/lib/cards/standard-card";

export type LoyaltyCardProps = CustomLoyaltyCardProps & {
  designMode?: string | null;
  customDesignEnabled?: boolean;
};

function LoyaltyCardFace({
  side,
  useCustom,
  props,
}: {
  side: "front" | "back";
  useCustom: boolean;
  props: LoyaltyCardProps;
}) {
  const standardProps: StandardLoyaltyCardProps = { ...props, side };
  return useCustom ? (
    <CustomLoyaltyCard {...props} side={side} />
  ) : (
    <StandardLoyaltyCard {...standardProps} />
  );
}

export function LoyaltyCard(props: LoyaltyCardProps) {
  const side = props.side ?? "front";
  const language = props.language ?? "EN";
  const cardProps: LoyaltyCardProps = {
    ...props,
    language,
  };
  const useCustom =
    cardDesignMode(cardProps.designMode) === "CUSTOM" &&
    cardProps.customDesignEnabled === true &&
    (cardProps.showSafeZones === true ||
      Boolean(
        cardProps.customFrontArtworkUrl && cardProps.customBackArtworkUrl,
      ));

  return (
    <div
      data-testid="loyalty-card-flip"
      data-card-side={side}
      data-card-presentation-language={language}
      className="w-full [perspective:1200px]"
    >
      <div
        className="grid transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none"
        style={{
          transform: side === "back" ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div
          className="[grid-area:1/1] [backface-visibility:hidden]"
          aria-hidden={side !== "front"}
        >
          <LoyaltyCardFace side="front" useCustom={useCustom} props={cardProps} />
        </div>
        <div
          className="[grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)]"
          aria-hidden={side !== "back"}
        >
          <LoyaltyCardFace side="back" useCustom={useCustom} props={cardProps} />
        </div>
      </div>
    </div>
  );
}
