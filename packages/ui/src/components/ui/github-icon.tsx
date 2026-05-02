import { siGithub } from "simple-icons";

export function GithubIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d={siGithub.path} />
    </svg>
  );
}
