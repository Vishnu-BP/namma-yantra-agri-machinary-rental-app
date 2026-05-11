/**
 * @file storage.ts — Supabase Storage helpers for machine photos and condition reports.
 * @module src/integrations/supabase
 *
 * Wraps expo-image-manipulator compression + supabase-js storage upload into
 * three focused helpers. Images are compressed before upload to keep Storage
 * costs low and load times fast on rural 4G connections.
 *
 * Bucket layout:
 *   machine-images/{machineId}/{index}.jpg   — listing photos (up to 5)
 *   condition-reports/{machineId}/{ts}.jpg   — AI condition report images (L6)
 */
import * as ImageManipulator from 'expo-image-manipulator';

import { createLogger } from '@/lib/logger';

import { supabase } from './client';

const log = createLogger('STORAGE');

// ─── Constants ────────────────────────────────────────────────────────────────

const MACHINE_IMAGES_BUCKET = 'machine-images';
const CONDITION_REPORTS_BUCKET = 'condition-reports';
const RESIZE_WIDTH = 1024;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compress + resize a local image URI to a 1024px-wide JPEG, then return
 * the compressed URI and an ArrayBuffer ready for upload.
 */
async function compressAndRead(
  localUri: string,
  quality: number,
): Promise<ArrayBuffer> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: RESIZE_WIDTH } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
  );
  const response = await fetch(result.uri);
  return response.arrayBuffer();
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Compress, upload, and return the public URL for a single machine listing photo.
 * Path: machine-images/{machineId}/{index}.jpg — upsert: true so re-uploads replace.
 */
export async function uploadMachineImage(
  machineId: string,
  localUri: string,
  index: number,
): Promise<string> {
  log.info('uploadMachineImage: start', { machineId, index });
  const buffer = await compressAndRead(localUri, 0.8);
  const path = `${machineId}/${index}.jpg`;

  const { error } = await supabase.storage
    .from(MACHINE_IMAGES_BUCKET)
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
  if (error) {
    log.error('uploadMachineImage: upload failed', error);
    throw error;
  }

  const { data } = supabase.storage.from(MACHINE_IMAGES_BUCKET).getPublicUrl(path);
  log.info('uploadMachineImage: done', { machineId, index, url: data.publicUrl });
  return data.publicUrl;
}

/**
 * Compress, upload, and return the public URL for an AI condition report image.
 * Uses a timestamp suffix so multiple reports per machine don't collide.
 */
export async function uploadConditionReportImage(
  machineId: string,
  localUri: string,
): Promise<string> {
  log.info('uploadConditionReportImage: start', { machineId });
  const buffer = await compressAndRead(localUri, 0.85);
  const path = `${machineId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from(CONDITION_REPORTS_BUCKET)
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: false });
  if (error) {
    log.error('uploadConditionReportImage: upload failed', error);
    throw error;
  }

  const { data } = supabase.storage.from(CONDITION_REPORTS_BUCKET).getPublicUrl(path);
  log.info('uploadConditionReportImage: done', { machineId });
  return data.publicUrl;
}

/**
 * List and remove all images for a machine from the machine-images bucket.
 * Called before deleting the machine row so Storage doesn't accumulate orphans.
 */
export async function deleteMachineImages(machineId: string): Promise<void> {
  log.info('deleteMachineImages: start', { machineId });
  const { data: files, error: listError } = await supabase.storage
    .from(MACHINE_IMAGES_BUCKET)
    .list(machineId);
  if (listError) {
    log.error('deleteMachineImages: list failed', listError);
    throw listError;
  }
  if (!files || files.length === 0) {
    log.info('deleteMachineImages: no files found', { machineId });
    return;
  }
  const paths = files.map((f) => `${machineId}/${f.name}`);
  const { error: removeError } = await supabase.storage
    .from(MACHINE_IMAGES_BUCKET)
    .remove(paths);
  if (removeError) {
    log.error('deleteMachineImages: remove failed', removeError);
    throw removeError;
  }
  log.info('deleteMachineImages: done', { machineId, count: paths.length });
}
