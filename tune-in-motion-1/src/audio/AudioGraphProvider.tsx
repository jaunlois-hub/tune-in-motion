import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useInputDevice, useOutputDevice } from '@/hooks/useDeviceSelect';
import { useToast } from '@/components/ui/use-toast';

interface AudioGraphContextType {
  audioContext: AudioContext | null;
  getInputAudioNode: () => MediaStreamAudioSourceNode | null;
  isMicrophoneAllowed: boolean;
  requestMicrophoneAccess: () => Promise<void>;
}

const AudioGraphContext = createContext<AudioGraphContextType | undefined>(undefined);

interface AudioGraphProviderProps {
  children: ReactNode;
}

export const AudioGraphProvider: React.FC<AudioGraphProviderProps> = ({ children }) => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [isMicrophoneAllowed, setIsMicrophoneAllowed] = useState(false);
  const { selectedInputDevice } = useInputDevice();
  const { selectedOutputDevice } = useOutputDevice();
  const { toast } = useToast();

  const requestMicrophoneAccess = async () => {
    try {
      // Check if permission is already granted
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (permissionStatus.state === 'granted') {
        setIsMicrophoneAllowed(true);
        return;
      }

      // Request permission if not granted
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      setIsMicrophoneAllowed(true);
      toast({
        title: "Microphone Access Granted",
        description: "Audio input is now available.",
      });
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setIsMicrophoneAllowed(false);
      toast({
        title: "Microphone Access Denied",
        description: "Please enable microphone permissions in your browser settings to use audio features.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Initialize AudioContext on user gesture
    const initializeAudioContext = () => {
      if (!audioContext) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
      }
      document.removeEventListener('click', initializeAudioContext);
      document.removeEventListener('keydown', initializeAudioContext);
    };

    document.addEventListener('click', initializeAudioContext);
    document.addEventListener('keydown', initializeAudioContext);

    return () => {
      document.removeEventListener('click', initializeAudioContext);
      document.removeEventListener('keydown', initializeAudioContext);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioContext, mediaStream]);

  useEffect(() => {
    const setupAudioInput = async () => {
      if (!audioContext) return;

      if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
      }

      if (isMicrophoneAllowed && selectedInputDevice) {
        try {
          // Stop existing tracks to release the device
          if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
          }

          const newStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: selectedInputDevice.deviceId,
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });
          setMediaStream(newStream);
          mediaStreamSourceRef.current = audioContext.createMediaStreamSource(newStream);
        } catch (err) {
          console.error('Error getting media stream with selected device:', err);
          toast({
            title: "Audio Input Error",
            description: "Could not access the selected microphone. Please check device permissions.",
            variant: "destructive",
          });
          setMediaStream(null);
          mediaStreamSourceRef.current = null;
          setIsMicrophoneAllowed(false); // Revoke access if device fails
        }
      } else if (!isMicrophoneAllowed && mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }
    };

    setupAudioInput();
  }, [audioContext, isMicrophoneAllowed, selectedInputDevice, toast]);

  useEffect(() => {
    if (audioContext && selectedOutputDevice && 'setSinkId' in HTMLAudioElement.prototype) {
      const setAllSinkIds = (element: HTMLMediaElement) => {
        if (element.sinkId !== selectedOutputDevice.deviceId) {
          (element as HTMLAudioElement).setSinkId(selectedOutputDevice.deviceId)
            .catch(e => console.error('Error setting sinkId:', e));
        }
      };

      // Apply to all currently playing audio/video elements
      document.querySelectorAll('audio, video').forEach(setAllSinkIds);

      // Mutation observer to apply to new elements
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node instanceof HTMLMediaElement) {
                setAllSinkIds(node);
              }
            });
          }
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });

      return () => observer.disconnect();
    }
  }, [audioContext, selectedOutputDevice]);

  const getInputAudioNode = () => {
    return mediaStreamSourceRef.current;
  };

  const value = {
    audioContext,
    getInputAudioNode,
    isMicrophoneAllowed,
    requestMicrophoneAccess,
  };

  return (
    <AudioGraphContext.Provider value={value}>
      {children}
    </AudioGraphContext.Provider>
  );
};

export const useAudioGraph = () => {
  const context = useContext(AudioGraphContext);
  if (context === undefined) {
    throw new Error('useAudioGraph must be used within an AudioGraphProvider');
  }
  return context;
};
