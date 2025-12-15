import React from 'react';
import { View, StyleSheet, ViewStyle, Dimensions } from 'react-native';

interface GlassLayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

const { width, height } = Dimensions.get('window');

export const GlassLayout = ({ children, style }: GlassLayoutProps) => {
  return (
    <View style={styles.container}>
      {/* Simulated Gradient Background */}
      <View style={styles.background}>
        <View style={styles.orb1} />
        <View style={styles.orb2} />
        <View style={styles.orb3} />
      </View>

      {/* Content */}
      <View style={[styles.content, style]}>{children}</View>
    </View>
  );
};

export const glassStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5, // Android shadow
    padding: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5', // Fallback
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E0F7FA', // Base light blue
    overflow: 'hidden',
  },
  orb1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(100, 181, 246, 0.4)', // Blue
  },
  orb2: {
    position: 'absolute',
    top: height * 0.2,
    right: -50,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(186, 104, 200, 0.4)', // Purple
  },
  orb3: {
    position: 'absolute',
    bottom: -100,
    left: width * 0.2,
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: 'rgba(77, 208, 225, 0.3)', // Cyan
  },
  content: {
    flex: 1,
  },
});
