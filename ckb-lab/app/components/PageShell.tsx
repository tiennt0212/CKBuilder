"use client";

import { Alert } from "antd";
import type { ReactNode } from "react";
import { issueUrl } from "@/lib/github";

/** Roadmap metadata for a route that has a nav entry but no implementation behind it yet. */
export interface PlannedRoute {
  /** Milestone title exactly as it reads on GitHub, e.g. "M1 · Bootcamp demo" */
  milestone: string;
  /** Tracking issue number */
  issue: number;
  /** True when a Claude Design artboard for this screen already exists */
  designed?: boolean;
}

interface PageShellProps {
  title: string;
  description: string;
  /** Pass on a placeholder route. Omit once the page renders a real implementation. */
  planned?: PlannedRoute;
  children?: ReactNode;
}

/**
 * An unbuilt page is not an error condition, so this renders `info` rather than `warning` and
 * addresses the person clicking rather than the developer: which milestone the page belongs to,
 * and where to follow it. Anything that reads as a failure here makes the whole app look broken.
 */
function PlannedNotice({ milestone, issue, designed }: PlannedRoute) {
  return (
    <Alert
      type="info"
      showIcon
      message={designed ? "Designed — not built yet" : "Not built yet"}
      description={
        <>
          {designed
            ? "The screen for this page is designed; the CKB logic behind it is not implemented yet."
            : "This route is on the roadmap and has no implementation yet."}{" "}
          Planned for <strong>{milestone}</strong>.{" "}
          <a
            href={issueUrl(issue)}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:text-primary-press"
          >
            Track progress in #{issue} ↗
          </a>
        </>
      }
    />
  );
}

export function PageShell({ title, description, planned, children }: PageShellProps) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="m-0 text-title font-semibold text-text-1 tracking-tightest">{title}</h2>
        <p className="m-0 text-body text-text-2">{description}</p>
      </div>

      {children ?? (planned && <PlannedNotice {...planned} />)}
    </div>
  );
}
