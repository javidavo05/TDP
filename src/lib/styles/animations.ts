/**
 * Premium Animations
 * Animaciones suaves y profesionales para el sistema
 */

export const animations = {
  // Fade animations
  fadeIn: {
    keyframes: `
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
    className: 'animate-fadeIn',
    duration: '300ms',
  },
  fadeInUp: {
    keyframes: `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
    className: 'animate-fadeInUp',
    duration: '400ms',
  },
  fadeInDown: {
    keyframes: `
      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
    className: 'animate-fadeInDown',
    duration: '400ms',
  },
  fadeInLeft: {
    keyframes: `
      @keyframes fadeInLeft {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `,
    className: 'animate-fadeInLeft',
    duration: '400ms',
  },
  fadeInRight: {
    keyframes: `
      @keyframes fadeInRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `,
    className: 'animate-fadeInRight',
    duration: '400ms',
  },

  // Slide animations
  slideUp: {
    keyframes: `
      @keyframes slideUp {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }
    `,
    className: 'animate-slideUp',
    duration: '300ms',
  },
  slideDown: {
    keyframes: `
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
        }
        to {
          transform: translateY(0);
        }
      }
    `,
    className: 'animate-slideDown',
    duration: '300ms',
  },
  slideLeft: {
    keyframes: `
      @keyframes slideLeft {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }
    `,
    className: 'animate-slideLeft',
    duration: '300ms',
  },
  slideRight: {
    keyframes: `
      @keyframes slideRight {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(0);
        }
      }
    `,
    className: 'animate-slideRight',
    duration: '300ms',
  },

  // Scale animations
  scaleIn: {
    keyframes: `
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `,
    className: 'animate-scaleIn',
    duration: '300ms',
  },
  scaleOut: {
    keyframes: `
      @keyframes scaleOut {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(0.9);
        }
      }
    `,
    className: 'animate-scaleOut',
    duration: '300ms',
  },

  // Pulse animations
  pulse: {
    keyframes: `
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    `,
    className: 'animate-pulse',
    duration: '2s',
  },
  pulseGlow: {
    keyframes: `
      @keyframes pulseGlow {
        0%, 100% {
          box-shadow: 0 0 0 0 rgba(0, 102, 204, 0.7);
        }
        50% {
          box-shadow: 0 0 0 10px rgba(0, 102, 204, 0);
        }
      }
    `,
    className: 'animate-pulseGlow',
    duration: '2s',
  },

  // Loading animations
  spin: {
    keyframes: `
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
    className: 'animate-spin',
    duration: '1s',
  },
  shimmer: {
    keyframes: `
      @keyframes shimmer {
        0% {
          background-position: -1000px 0;
        }
        100% {
          background-position: 1000px 0;
        }
      }
    `,
    className: 'animate-shimmer',
    duration: '2s',
  },

  // Hover effects
  hoverLift: {
    keyframes: `
      @keyframes hoverLift {
        from {
          transform: translateY(0);
        }
        to {
          transform: translateY(-4px);
        }
      }
    `,
    className: 'hover:animate-hoverLift',
    duration: '200ms',
  },
  hoverScale: {
    keyframes: `
      @keyframes hoverScale {
        from {
          transform: scale(1);
        }
        to {
          transform: scale(1.05);
        }
      }
    `,
    className: 'hover:animate-hoverScale',
    duration: '200ms',
  },
} as const;

// Utility function to get animation classes
export const getAnimationClass = (animation: keyof typeof animations) => {
  return animations[animation].className;
};

// CSS string for all animations (to be injected in globals.css)
export const animationsCSS = Object.values(animations)
  .map((anim) => anim.keyframes)
  .join('\n\n');

