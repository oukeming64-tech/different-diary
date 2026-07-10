import {
  type CreateActivityRecordInput,
  type SavedActivityCheckIn,
  type Stage1Database,
} from "../stage1";
import { saveActivityCheckIn } from "./storage";

/**
 * The movement path is deliberately local-only. Keeping the adapter small
 * makes the no-account, no-provider and no-network boundary easy to audit.
 */
export async function recordActivityLocally(
  input: CreateActivityRecordInput,
  database?: Stage1Database,
): Promise<SavedActivityCheckIn> {
  return saveActivityCheckIn(input, database);
}
