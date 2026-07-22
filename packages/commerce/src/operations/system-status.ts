import { Result } from "better-result";

export type SystemStatus = {
  status: "ready";
};

export type SystemError = {
  _tag: "SystemUnavailable";
  message: string;
};

export const getSystemStatus = (available: boolean) =>
  available
    ? Result.ok<SystemStatus, SystemError>({ status: "ready" })
    : Result.err<SystemStatus, SystemError>({
        _tag: "SystemUnavailable",
        message: "The system is unavailable.",
      });
