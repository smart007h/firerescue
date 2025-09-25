import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

const VideoPlayer = ({ visible, videoUri, onClose, title = 'Video' }) => {
  // Get screen dimensions safely inside the component
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  React.useEffect(() => {
    const subscription = player.addListener('statusChange', (status) => {
      setIsPlaying(status.isPlaying);
      setCurrentTime(status.currentTime * 1000); // Convert to milliseconds for compatibility
      if (status.duration) {
        setDuration(status.duration * 1000); // Convert to milliseconds for compatibility
        setIsLoading(false);
      }
    });

    const errorSubscription = player.addListener('playbackError', (error) => {
      setIsLoading(false);
      setHasError(true);
      console.error('Video playback error:', error);
    });

    return () => {
      subscription?.remove();
      errorSubscription?.remove();
    };
  }, [player]);

  const handlePlayPause = () => {
    try {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.error('Error controlling video playback:', error);
      Alert.alert('Error', 'Failed to control video playback');
    }
  };

  const handleClose = () => {
    try {
      player.pause();
    } catch (error) {
      console.error('Error stopping video:', error);
    }
    setIsLoading(true);
    setHasError(false);
    onClose();
  };

  const formatTime = (milliseconds) => {
    if (!milliseconds) return '0:00';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.videoContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Video Player */}
          <View style={styles.videoWrapper}>
            {hasError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={50} color="#ff4444" />
                <Text style={styles.errorText}>Failed to load video</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    setHasError(false);
                    setIsLoading(true);
                  }}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <VideoView
                  style={styles.video}
                  player={player}
                  allowsFullscreen={false}
                  allowsPictureInPicture={false}
                  showsTimecodes={false}
                  requiresLinearPlayback={false}
                />
                
                {isLoading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>Loading video...</Text>
                  </View>
                )}

                {/* Custom Controls */}
                {!isLoading && duration > 0 && (
                  <View style={styles.controls}>
                    <TouchableOpacity 
                      onPress={handlePlayPause}
                      style={styles.playButton}
                    >
                      <Ionicons 
                        name={isPlaying ? "pause" : "play"} 
                        size={40} 
                        color="#fff" 
                      />
                    </TouchableOpacity>
                    
                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                      <Text style={styles.timeText}>
                        {formatTime(currentTime)}
                      </Text>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              width: duration 
                                ? `${(currentTime / duration) * 100}%` 
                                : '0%' 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.timeText}>
                        {formatTime(duration)}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: '95%',
    height: '80%',
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
  },
  video: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
  },
  playButton: {
    alignSelf: 'center',
    marginBottom: 16,
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
});

export default VideoPlayer;
