export const GITHUB_REPO_URL = "https://github.com/tiennt0212/CKBuilder";

export function issueUrl(issue: number): string {
  return `${GITHUB_REPO_URL}/issues/${issue}`;
}
