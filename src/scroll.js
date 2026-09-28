// The app scrolls inside #root rather than the whole page, so the sky
// behind it never moves (see styles.css).
export const scrollToTop = () => document.querySelector('.scroller')?.scrollTo(0, 0);
