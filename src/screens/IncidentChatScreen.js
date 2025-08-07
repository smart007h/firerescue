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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

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
  const [otherParticipant, setOtherParticipant] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Get current user from either AuthContext (dispatchers) or Supabase auth (civilians)
  const { user: authContextUser, loading: contextLoading } = useAuth();

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        setAuthLoading(true);
        
        // First, try to get user from AuthContext (for dispatchers)
        if (authContextUser && !contextLoading) {
          setCurrentUser(authContextUser);
          setAuthLoading(false);
          return;
        }
        
        // If no AuthContext user, try Supabase auth (for civilians)
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user) {
          setCurrentUser(user);
        } else {
          console.log('No authenticated user found');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    getCurrentUser();
  }, [authContextUser, contextLoading]);

  const isAuthenticated = !!currentUser;

  // Only allow chat for reporter or assigned dispatcher
  let notAllowedReason = '';
  
  // Get the user ID safely (handle both dispatcher and civilian user structures)
  const getUserId = (user) => {
    if (!user) return null;
    // For dispatchers (AuthContext), use id directly
    // For civilians (Supabase auth), use id
    return user.id;
  };

  const currentUserId = getUserId(currentUser);
  const isIncidentParticipant = !!currentUserId && !!incident &&
    (currentUserId === incident.reported_by || currentUserId === incident.dispatcher_id);
    
  if (!isAuthenticated) {
    notAllowedReason = 'You are not logged in.';
  } else if (!!currentUser && !!incident) {
    if (incident.status === 'resolved' || incident.status === 'cancelled') {
      notAllowedReason = 'This incident has been resolved or cancelled. Chat is no longer available.';
    } else if (currentUserId !== incident.reported_by && currentUserId !== incident.dispatcher_id) {
      notAllowedReason = 'You are not allowed to participate in this chat because you are neither the reporter nor the assigned dispatcher for this incident.';
    } else if (!incident.dispatcher_id) {
      notAllowedReason = 'No dispatcher has been assigned to this incident yet.';
    }
  }

  useEffect(() => {
    if (!authLoading && incidentId) {
    loadIncident();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId, authLoading, currentUser]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && incident && isIncidentParticipant) {
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, incident, isIncidentParticipant]);

  // Debug: log user and incident info for troubleshooting chat access (only for errors)
  useEffect(() => {
    if (__DEV__ && (!isAuthenticated || !isIncidentParticipant || notAllowedReason)) {
      console.log('IncidentChatScreen access issue:', {
        isAuthenticated,
        isIncidentParticipant,
        notAllowedReason,
      });
    }
  }, [isAuthenticated, isIncidentParticipant, notAllowedReason]);

  // Debug: log route params, session, and user info on mount
  useEffect(() => {
    if (__DEV__) {
      console.log('IncidentChatScreen route.params:', route.params);
      supabase.auth.getSession().then((sessionRes) => {
        console.log('Supabase getSession:', sessionRes);
      });
    }
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:sender_id (
            email,
            full_name,
            role
          )
        `)
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      if (!currentUser) {
        alert('Not logged in. Please log in to send messages.');
        return;
      }

      // For dispatchers, ensure they have a profile record before sending messages
      if (currentUser.role === 'dispatcher') {
        // First check by ID, then by email if ID check fails
        let existingProfile = null;
        
        const { data: profileById, error: profileCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', currentUserId)
          .maybeSingle();

        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          console.error('Error checking profile by ID:', profileCheckError);
        }

        existingProfile = profileById;

        // If no profile found by ID, check by email (in case there's a profile with different ID)
        if (!existingProfile) {
          const { data: profileByEmail, error: emailCheckError } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', currentUser.email)
            .maybeSingle();

          if (emailCheckError && emailCheckError.code !== 'PGRST116') {
            console.error('Error checking profile by email:', emailCheckError);
          }

          existingProfile = profileByEmail;

          // If profile exists with different ID, update it to use the current user's ID
          if (existingProfile && existingProfile.id !== currentUserId) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                id: currentUserId,
                full_name: currentUser.user_metadata?.full_name || currentUser.email,
                phone: currentUser.user_metadata?.phone,
              })
              .eq('email', currentUser.email);

            if (updateError) {
              console.error('Error updating existing profile:', updateError);
            } else {
              console.log('Updated existing profile with new ID');
            }
          }
        }

        // Create profile only if it doesn't exist at all
        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: currentUserId,
              email: currentUser.email,
              full_name: currentUser.user_metadata?.full_name || currentUser.email,
              phone: currentUser.user_metadata?.phone,
              role: 'user' // Use 'user' role since dispatcher isn't allowed in profiles constraint
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
            setError('Failed to create user profile');
            return;
          } else {
            console.log('Created new profile for dispatcher');
          }
        }
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          incident_id: incidentId,
          sender_id: currentUserId,
          message: newMessage.trim(),
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      setNewMessage('');
      await loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const loadIncident = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, reported_by, dispatcher_id')
        .eq('id', incidentId)
        .maybeSingle();
      if (!error && data) {
        setIncident(data);
        // Determine the other participant
        if (currentUser && data.reported_by && data.dispatcher_id) {
          // You may want to fetch reporter/dispatcher profiles separately if needed
        }
      } else if (error) {
        console.error('Error loading incident for chat:', error);
      }
    } catch (err) {
      console.error('Error loading incident for chat:', err);
    }
  };

  // Determine chat partner role for header
  let chatHeader = 'Chat';
  if (otherParticipant) {
    if (otherParticipant.full_name) {
      chatHeader = `Chat with ${otherParticipant.full_name}`;
    } else if (otherParticipant.email) {
      chatHeader = `Chat with ${otherParticipant.email}`;
    }
  }

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.sender_id === currentUserId;
    // Determine role label: Check if sender is dispatcher by comparing with incident's dispatcher_id
    const isDispatcher = item.sender_id === incident?.dispatcher_id;
    const roleLabel = isCurrentUser ? 'You' : (isDispatcher ? 'Dispatcher' : 'User');
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.sentMessage : styles.receivedMessage
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          {!isCurrentUser && (
            <Text style={styles.senderName}>
              {item.sender?.full_name || item.sender?.email || 'Unknown User'}
            </Text>
          )}
          <View style={[styles.roleBadge, isCurrentUser ? styles.roleBadgeYou : isDispatcher ? styles.roleBadgeDispatcher : styles.roleBadgeUser]}>
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

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{chatHeader}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC3545" />
          <Text style={styles.loadingText}>Loading authentication...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{chatHeader}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{chatHeader}</Text>
      </View>

      {/* User Info Section */}
      {otherParticipant && (
        <View style={{ padding: 12, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
            {otherParticipant.full_name || otherParticipant.email}
          </Text>
          {otherParticipant.email && (
            <Text style={{ color: '#666', fontSize: 14 }}>{otherParticipant.email}</Text>
          )}
          {otherParticipant.phone && (
            <Text style={{ color: '#666', fontSize: 14 }}>{otherParticipant.phone}</Text>
          )}
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
          editable={isAuthenticated && isIncidentParticipant}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || !isAuthenticated || !isIncidentParticipant) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || !isAuthenticated || !isIncidentParticipant}
        >
          <Ionicons
            name="send"
            size={24}
            color={newMessage.trim() && isAuthenticated && isIncidentParticipant ? '#DC3545' : '#666'}
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {!isIncidentParticipant && (
        <View style={{ padding: 16, alignItems: 'center' }}>
          <Text style={{ color: '#DC3545', fontWeight: 'bold', textAlign: 'center' }}>
            {notAllowedReason || 'You are not allowed to participate in this chat.'}
          </Text>
          <Text style={{ color: '#666', fontSize: 12, marginTop: 8 }}>
            If you believe this is an error, please check that you are logged in as the correct user or dispatcher, and that the dispatcher is assigned to this incident.
          </Text>
          {__DEV__ && (
            <View style={{ marginTop: 12, backgroundColor: '#f8f9fa', padding: 8, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: '#333' }}>Debug Info:</Text>
              <Text style={{ fontSize: 12, color: '#333' }}>Route Params: {JSON.stringify(route.params)}</Text>
              <Text style={{ fontSize: 12, color: '#333' }}>Current User: {currentUser?.id}</Text>
              <Text style={{ fontSize: 12, color: '#333' }}>Incident Reporter: {incident?.reported_by}</Text>
              <Text style={{ fontSize: 12, color: '#333' }}>Incident Dispatcher: {incident?.dispatcher_id}</Text>
            </View>
          )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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