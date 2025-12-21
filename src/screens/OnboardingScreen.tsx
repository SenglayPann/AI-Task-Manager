import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { setProfile, completeOnboarding } from '../store/slices/userSlice';
import {
  IUserProfile,
  GENDER_OPTIONS,
  CAREER_OPTIONS,
} from '../types/userProfile';
import { GlassLayout, glassStyles } from '../components/GlassLayout';

export const OnboardingScreen = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<IUserProfile['gender']>(undefined);
  const [career, setCareer] = useState('');
  const [customCareer, setCustomCareer] = useState('');
  const [showCareerOptions, setShowCareerOptions] = useState(false);

  const handleGetStarted = () => {
    if (!name.trim()) {
      return; // Name is required
    }

    const profile: IUserProfile = {
      name: name.trim(),
      age: age ? parseInt(age, 10) : undefined,
      gender,
      career: career === 'Other' ? customCareer : career,
    };

    dispatch(setProfile(profile));
    dispatch(completeOnboarding());
    navigation.replace('Dashboard');
  };

  const isFormValid = name.trim().length > 0;

  return (
    <GlassLayout>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.emoji}>👋</Text>
              <Text style={styles.title}>Welcome!</Text>
              <Text style={styles.subtitle}>
                Tell me a bit about yourself so I can assist you better.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>What's your name? *</Text>
                <TextInput
                  style={[glassStyles.input, styles.input]}
                  placeholder="Enter your name"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Age */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>How old are you?</Text>
                <TextInput
                  style={[glassStyles.input, styles.input]}
                  placeholder="Enter your age"
                  placeholderTextColor="#999"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>

              {/* Gender */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.optionsRow}>
                  {GENDER_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        gender === option.value && styles.optionSelected,
                      ]}
                      onPress={() =>
                        setGender(option.value as IUserProfile['gender'])
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          gender === option.value && styles.optionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Career */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>What do you do?</Text>
                <TouchableOpacity
                  style={[glassStyles.input, styles.dropdownButton]}
                  onPress={() => setShowCareerOptions(!showCareerOptions)}
                >
                  <Text
                    style={
                      career ? styles.dropdownText : styles.dropdownPlaceholder
                    }
                  >
                    {career || 'Select your career'}
                  </Text>
                  <Text style={styles.dropdownArrow}>
                    {showCareerOptions ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {showCareerOptions && (
                  <ScrollView
                    style={styles.careerOptions}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    {CAREER_OPTIONS.map(option => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.careerOption,
                          career === option && styles.careerOptionSelected,
                        ]}
                        onPress={() => {
                          setCareer(option);
                          if (option !== 'Other') {
                            setShowCareerOptions(false);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.careerOptionText,
                            career === option &&
                              styles.careerOptionTextSelected,
                          ]}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {career === 'Other' && (
                  <TextInput
                    style={[glassStyles.input, styles.input, { marginTop: 10 }]}
                    placeholder="Enter your profession"
                    placeholderTextColor="#999"
                    value={customCareer}
                    onChangeText={setCustomCareer}
                  />
                )}
              </View>
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={[
                styles.ctaButton,
                !isFormValid && styles.ctaButtonDisabled,
              ]}
              onPress={handleGetStarted}
              disabled={!isFormValid}
            >
              <Text style={styles.ctaButtonText}>Get Started 🚀</Text>
            </TouchableOpacity>

            <Text style={styles.privacyNote}>
              Your information is stored locally and never shared.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GlassLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    fontSize: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  optionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#555',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  careerOptions: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 8,
    maxHeight: 200,
  },
  careerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  careerOptionSelected: {
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  careerOptionText: {
    fontSize: 15,
    color: '#333',
  },
  careerOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  ctaButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  privacyNote: {
    marginTop: 16,
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
});
