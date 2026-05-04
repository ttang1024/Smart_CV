interface LogoProps {
  className?: string;
  style?: React.CSSProperties;
}

function ImageLogo({ src, alt, className, style }: LogoProps & { src: string; alt: string }) {
  return <img src={src} alt={alt} className={className} style={{ objectFit: 'contain', ...style }} />;
}

export function OpenAILogo({ className, style }: LogoProps) {
  return <ImageLogo src="/images/openai.svg" alt="OpenAI" className={className} style={style} />;
}

export function GeminiLogo({ className, style }: LogoProps) {
  return <ImageLogo src="/images/gemini.png" alt="Gemini" className={className} style={style} />;
}

export function ClaudeLogo({ className, style }: LogoProps) {
  return <ImageLogo src="/images/claude.ico" alt="Claude" className={className} style={style} />;
}

export function GrokLogo({ className, style }: LogoProps) {
  return <ImageLogo src="/images/grok.ico" alt="Grok" className={className} style={style} />;
}

export function DeepSeekLogo({ className, style }: LogoProps) {
  return <ImageLogo src="/images/deepseek.png" alt="DeepSeek" className={className} style={style} />;
}

export function QianwenLogo({ className, style }: LogoProps) {
  return <ImageLogo src="/images/qwen.png" alt="Qianwen" className={className} style={style} />;
}

export function KimiLogo({ className, style }: LogoProps) {
  return <ImageLogo src="/images/moonshot.ico" alt="Kimi" className={className} style={style} />;
}

export function DoubaoLogo({ className, style }: LogoProps) {
  return <ImageLogo src="/images/doubao.png" alt="Doubao" className={className} style={style} />;
}

export function WenyanyixinLogo({ className, style }: LogoProps) {
  return <ImageLogo src="/images/yiyan.ico" alt="Wenyan Yixin" className={className} style={style} />;
}
