import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ImagePlus, ArrowLeft, CheckCircle, Bot, Trash2 } from 'lucide-react';
import { db } from '@/db/database';
import { nowUtc } from '@/domain/shared/dates';
import { Button } from '@/components/common/Button';
import styles from './PhotoCapturePage.module.css';

function uuid(): string { return crypto.randomUUID(); }

export default function PhotoCapturePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [storing, setStoring] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setStoring(true);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Store blob in IndexedDB
    const id = uuid();
    await db.captures.put({
      id,
      blob: file,
      mimeType: file.type,
      sizeBytes: file.size,
      createdAt: nowUtc(),
    });

    setCaptureId(id);
    setStoring(false);
  }, []);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
  };

  const handleRemovePhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (captureId) db.captures.delete(captureId);
    setPreviewUrl(null);
    setCaptureId(null);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.back}
          onClick={() => navigate('/add')}
          aria-label="Back to add meal"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className={styles.title}>Stage Photo</h1>
      </header>

      {!captureId ? (
        <div className={styles.capture}>
          <div className={styles.uploadArea}>
            <div className={styles.uploadIcon}>
              <Camera size={40} strokeWidth={1.5} />
            </div>
            <h2 className={styles.uploadTitle}>Add a photo of your meal</h2>
            <p className={styles.uploadDesc}>
              Your photo stays on this device. Your AI agent can analyze the visible preview, or you can attach the photo directly in your agent conversation.
            </p>
            <div className={styles.uploadBtns}>
              <Button
                variant="primary"
                icon={<Camera size={16} />}
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.setAttribute('capture', 'environment');
                    fileRef.current.click();
                  }
                }}
              >
                Take photo
              </Button>
              <Button
                variant="secondary"
                icon={<ImagePlus size={16} />}
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.removeAttribute('capture');
                    fileRef.current.click();
                  }
                }}
              >
                Choose from library
              </Button>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={handleInputChange}
            aria-label="Select image file"
          />
        </div>
      ) : (
        <div className={styles.staged}>
          <div className={styles.previewContainer}>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Staged meal photo for agent analysis"
                className={styles.preview}
              />
            )}
            <button
              className={styles.removePhoto}
              onClick={handleRemovePhoto}
              aria-label="Remove photo"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>

          <div className={styles.readyBanner}>
            <CheckCircle size={20} color="var(--color-accent)" aria-hidden="true" />
            <span>Photo ready for your agent</span>
          </div>

          <div className={styles.instructions}>
            <div className={styles.instructionStep}>
              <span className={styles.stepNum}>1</span>
              <span>Open or switch to your AI agent (e.g., Claude, Gemini in a browser).</span>
            </div>
            <div className={styles.instructionStep}>
              <span className={styles.stepNum}>2</span>
              <span>The agent can see this page's visible content, including the photo above.</span>
            </div>
            <div className={styles.instructionStep}>
              <span className={styles.stepNum}>3</span>
              <span>Ask the agent to "analyze the meal photo and log it". It will call <code>create_meal_draft</code>.</span>
            </div>
            <div className={styles.instructionStep}>
              <span className={styles.stepNum}>4</span>
              <span>A draft will appear for your review before anything is saved.</span>
            </div>
          </div>

          <div className={styles.clarification}>
            <Bot size={16} color="var(--color-text-muted)" aria-hidden="true" />
            <p>
              <strong>Important:</strong> NutriTrack does not include an AI model. Your external agent reads the visible photo. No image data is sent to this app's servers — photos stay on your device.
            </p>
          </div>

          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate('/')}
          >
            Back to Today
          </Button>
        </div>
      )}
    </div>
  );
}
