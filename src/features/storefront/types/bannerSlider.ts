export type BannerSliderSlide = {
  id: string;
  src: string;
  alt?: string;
};

export type BannerSliderProps = Readonly<{
  slides: BannerSliderSlide[];
  ariaLabel: string;
  onSlideClick?: () => void;
  imgClassName?: string;
  slideClassName?: string;
  rotateMs?: number;
  showDots?: boolean;
}>;

export type BannerSliderSlideState = {
  current: number;
  outgoing: number | null;
};
