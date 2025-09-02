import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IncidentChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { incidentId, returnTo } = route.params;
  const flatListRef = useRef(null);
  const [incident, setIncident] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState('user'); // 'user' or 'dispatcher'
  const { user: authContextUser, userRole } = useAuth();

  // Enhanced user detection for both civilian users and dispatchers
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        
        // Check for dispatcher first (from AuthContext)
        if (authContextUser && userRole === 'dispatcher') {
          setCurrentUser(authContextUser);
          setUserType('dispatcher');
          return;
        }

        // Check for regular user session
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user) {
          setCurrentUser(user);
          setUserType('user');
          return;
        }

        // Check AsyncStorage for dispatcher session
        const stationData = await AsyncStorage.getItem('stationData');
        if (stationData) {
          const station = JSON.parse(stationData);
          setCurrentUser({ id: station.id, email: station.email, user_metadata: { full_name: station.name } });
          setUserType('dispatcher');
          return;
        }

        setError('Please log in to access chat');
      } catch (err) {
        console.error('Error getting current user:', err);
        setError('Authentication error');
      }
    };

    getCurrentUser();
  }, [authContextUser, userRole]);

  // Load incident and check permissions
  useEffect(() => {
    if (currentUser && incidentId) {
      loadIncident();
    }
  }, [currentUser, incidentId]);

  // Load messages when we have incident and user
  useEffect(() => {
    if (currentUser && incident) {
      loadMessages();
      
      // Set up real-time subscription for new messages
      console.log('[Chat] Setting up real-time subscription for incident:', incidentId);
      
      const subscription = supabase
        .channel(`chat_${incidentId}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'chat_messages',
            filter: `incident_id=eq.${incidentId}`
          }, 
          (payload) => {
            console.log('[Chat] Real-time: New message received:', payload.new);
            // Add a small delay to ensure the message is fully written to DB
            setTimeout(() => {
              loadMessages();
            }, 500);
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public', 
            table: 'chat_messages',
            filter: `incident_id=eq.${incidentId}`
          },
          (payload) => {
            console.log('[Chat] Real-time: Message updated:', payload.new);
            setTimeout(() => {
              loadMessages();
            }, 500);
          }
        )
        .subscribe((status) => {
          console.log('[Chat] Subscription status:', status);
        });

      return () => {
        console.log('[Chat] Cleaning up subscription');
        subscription.unsubscribe();
      };
    }
  }, [currentUser, incident, incidentId]);

  const loadIncident = async () => {
    try {
      console.log('[Chat] Loading incident:', incidentId);
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', incidentId)
        .single();

      if (error) {
        console.error('[Chat] Error loading incident:', error);
        setError('Failed to load incident details');
        return;
      }

      console.log('[Chat] Incident loaded:', data);
      setIncident(data);
    } catch (err) {
      console.error('[Chat] Error in loadIncident:', err);
      setError('Failed to load incident');
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      console.log('[Chat] Loading messages for incident:', incidentId);
      
      // Use direct table query for now, fallback to view if needed
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[Chat] Error loading messages:', error);
        setError('Failed to load messages');
        return;
      }

      console.log('[Chat] Raw messages loaded:', data?.length || 0);
      
      // Process messages to add sender info manually
      const processedMessages = await Promise.all((data || []).map(async (msg) => {
        let senderName = 'Unknown User';
        let senderEmail = '';
        let role = msg.sender_type || 'user';
        
        if (msg.sender_type === 'dispatcher' || !msg.sender_type) {
          // Try to get dispatcher info
          const { data: dispatcherData } = await supabase
            .from('dispatchers')
            .select('name, email')
            .eq('id', msg.sender_id)
            .single();
            
          if (dispatcherData) {
            senderName = dispatcherData.name;
            senderEmail = dispatcherData.email;
            role = 'dispatcher';
          }
        }
        
        if (role === 'user' || !senderName || senderName === 'Unknown User') {
          // Try to get user info from profiles
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', msg.sender_id)
            .single();
            
          if (profileData) {
            senderName = profileData.full_name || profileData.email;
            senderEmail = profileData.email;
            role = 'user';
          }
        }
        
        return {
          ...msg,
          sender_name: senderName,
          sender_email: senderEmail,
          role: role
        };
      }));

      console.log('[Chat] Processed messages:', processedMessages);
      setMessages(processedMessages);
    } catch (err) {
      console.error('[Chat] Error in loadMessages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      console.log('[Chat] Sending message as:', userType, currentUser.id);
      
      // Create the message object
      const messageData = {
        incident_id: incidentId,
        sender_id: currentUser.id,
        sender_type: userType,
        message: messageText,
        created_at: new Date().toISOString(),
      };

      // Insert to database
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('[Chat] Error sending message:', error);
        Alert.alert('Error', 'Failed to send message. Please try again.');
        setNewMessage(messageText); // Restore message on error
        return;
      }

      console.log('[Chat] Message sent successfully:', data);
      
      // Immediately add the message to local state for instant feedback
      const newMsg = {
        ...data,
        sender_name: userType === 'dispatcher' 
          ? (currentUser.user_metadata?.full_name || 'Dispatcher')
          : (currentUser.user_metadata?.full_name || currentUser.email || 'User'),
        sender_email: currentUser.email,
        role: userType
      };
      
      setMessages(prev => [...prev, newMsg]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (err) {
      console.error('[Chat] Error in sendMessage:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setNewMessage(messageText); // Restore message on error
    }
  };

  // Check if user can participate in chat
  const canParticipate = () => {
    if (!currentUser || !incident) return false;
    
    const isReporter = currentUser.id === incident.reported_by;
    const isDispatcher = currentUser.id === incident.dispatcher_id;
    
    return isReporter || isDispatcher;
  };

  // Determine chat partner info
  const getChatPartner = () => {
    if (!incident) return null;
    
    if (userType === 'dispatcher') {
      return { name: 'Incident Reporter', role: 'Reporter' };
    } else {
      return { name: 'Emergency Dispatcher', role: 'Dispatcher' };
    }
  };

  // Determine chat header
  const chatPartner = getChatPartner();
  const chatHeader = chatPartner ? `Chat with ${chatPartner.name}` : 'Incident Chat';

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.sender_id === currentUser?.id;
    const isDispatcher = item.role === 'dispatcher';
    const roleLabel = isCurrentUser ? 'You' : (isDispatcher ? 'Dispatcher' : 'Reporter');
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.sentMessage : styles.receivedMessage
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          {!isCurrentUser && (
            <Text style={styles.senderName}>
              {item.sender_name || 'Unknown User'}
            </Text>
          )}
          <View style={[
            styles.roleBadge, 
            isCurrentUser ? styles.roleBadgeYou : 
            isDispatcher ? styles.roleBadgeDispatcher : styles.roleBadgeUser
          ]}>
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>
        </View>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.sentBubble : styles.receivedBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.sentMessageText : styles.receivedMessageText
          ]}>
            {item.message}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(item.created_at).toLocaleTimeString()}
          </Text>
        </View>
      </View>
    );
  };

  const handleBackPress = () => {
    if (returnTo === 'UserReportHistory') {
      navigation.navigate('UserReportHistory');
    } else if (returnTo === 'CivilianIncidentDetails') {
      navigation.navigate('CivilianIncidentDetails', { incidentId, incident });
    } else if (returnTo === 'CivilianTrackingScreen') {
      navigation.navigate('CivilianTrackingScreen', { incidentId, incident });
    } else {
      navigation.goBack();
    }
  };

  // Loading state
  if (loading || !currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{chatHeader}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC3545" />
          <Text style={styles.loadingText}>
            {!currentUser ? 'Authenticating...' : 'Loading chat...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{chatHeader}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadMessages}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{chatHeader}</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadMessages}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Chat Info */}
      {incident && (
        <View style={styles.chatInfo}>
          <Text style={styles.chatInfoText}>
            Incident ID: {incident.id?.substring(0, 8)}...
          </Text>
          <Text style={styles.chatInfoText}>
            Status: {incident.status || 'Active'}
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#666"
          multiline
          editable={canParticipate()}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || !canParticipate()) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || !canParticipate()}
        >
          <Ionicons
            name="send"
            size={24}
            color={newMessage.trim() && canParticipate() ? '#DC3545' : '#666'}
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {!canParticipate() && (
        <View style={styles.notAllowedContainer}>
          <Text style={styles.notAllowedText}>
            {!incident 
              ? 'Loading incident details...'
              : !incident.dispatcher_id 
                ? 'No dispatcher has been assigned to this incident yet.'
                : 'You are not authorized to participate in this chat.'
            }
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#DC3545',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  refreshButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  chatInfo: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatInfoText: {
    fontSize: 12,
    color: '#666',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  sentBubble: {
    backgroundColor: '#DC3545',
  },
  receivedBubble: {
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
  },
  sentMessageText: {
    color: '#fff',
  },
  receivedMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  notAllowedContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff2f2',
    borderTopWidth: 1,
    borderTopColor: '#ffebee',
  },
  notAllowedText: {
    color: '#DC3545',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  roleBadge: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  roleBadgeDispatcher: {
    backgroundColor: '#2563eb',
  },
  roleBadgeUser: {
    backgroundColor: '#DC3545',
  },
  roleBadgeYou: {
    backgroundColor: '#aaa',
  },
});

export default IncidentChatScreen; 