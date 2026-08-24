import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Circle, Skia, Path, LinearGradient, vec, Image, useImage, useCanvasRef } from '@shopify/react-native-skia';

const GRADIENT_SCHEMES = {
  indigo: ['#0f172a', '#1e1b4b', '#311042'],
  emerald: ['#022c22', '#064e3b', '#115e59'],
  cyberpunk: ['#1c0d2b', '#2e0854', '#701a75'],
  slate: ['#0f172a', '#1e293b', '#334155']
};

const { width: WINDOW_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = WINDOW_WIDTH * 0.88; 

// Replace with your local machine desktop network IP address (e.g. 192.168.1.XX)
const LOCAL_BACKEND_IP = '192.168.100.6'; 

export default function App() {
  const [activePreset, setActivePreset] = useState('twitch');
  const [activeGradient, setActiveGradient] = useState('indigo');
  const [isCompiling, setIsCompiling] = useState(false);
  
  // High-performance canvas hook bound directly to the declarative canvas element node
  const canvasRef = useCanvasRef();

  // Native image loader hook fetching resource arrays directly to the GPU thread
  const brandingBgImage = useImage("https://picsum.photos");

  // Fully compliant with React Native Skia's updated immutable builder pattern specs
  const getClipPath = () => {
    const half = CANVAS_SIZE / 2;
    
    if (activePreset === 'twitch') {
      // Twitch & TikTok: Build an explicit circular path boundary map
      return Skia.PathBuilder.Make()
        .addCircle(half, half, half)
        .build();
    } else if (activePreset === 'mobile-app') {
      // Mobile Squircles: Build a rounded rectangle boundary structure
      const rect = Skia.XYWHRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const roundedRect = Skia.RRectXY(rect, 48, 48);
      return Skia.PathBuilder.Make()
        .addRRect(roundedRect)
        .build();
    } else {
      // Favicons: Crisp viewport rectangle bounding configuration box
      const rect = Skia.XYWHRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      return Skia.PathBuilder.Make()
        .addRect(rect)
        .build();
    }
  };


  const handleCompileIcon = async () => {
    if (isCompiling) return;
    setIsCompiling(true);

    try {
      // Accesses the GPU frame buffer data directly with zero reference drill delays
      const image = canvasRef.current?.makeImageSnapshot();
      if (!image) {
        throw new Error("Graphics frame not ready. Try switching parameters or reloading.");
      }

      // Encode using standard uncompressed web-safe PNG binary string encodings
      const data = image.encodeToBase64(1, 100);
      
      const response = await fetch(`http://${LOCAL_BACKEND_IP}:8787/branding/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBuffer: data }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error status: ${response.status}`);
      }

      Alert.alert("Success 🎉", "Multi-resolution Windows .ICO configuration compiled smoothly at the edge!");
    } catch (error) {
      console.error(error);
      Alert.alert("Compilation Error", error.message);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#020617" />
        
        <View style={styles.header}>
          <Text style={styles.title}>Micro-Branding Studio</Text>
          <Text style={styles.subtitle}>Vector Asset Engine</Text>
        </View>

        {/* Unified Hardware Accelerated Canvas Surface Container */}
        <View style={styles.canvasContainer} collapsable={false}>
          <View style={styles.outerCanvasBounds}>
            <Canvas ref={canvasRef} style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
              <Path path={getClipPath()}>
                {/* Fallback to smooth gradient if background remote asset is still loading */}
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(CANVAS_SIZE, CANVAS_SIZE)}
                  colors={GRADIENT_SCHEMES[activeGradient]}
                />
                {brandingBgImage && (
                  <Image
                    image={brandingBgImage}
                    x={0}
                    y={0}
                    width={CANVAS_SIZE}
                    height={CANVAS_SIZE}
                    fit="cover"
                  />
                )}
              </Path>
              <Circle cx={CANVAS_SIZE / 2} cy={CANVAS_SIZE / 2} r={32} color="#ffffff" opacity={0.3} />
            </Canvas>
          </View>
        </View>

        {/* Dashboard Control panel */}
        <View style={styles.controlsCard}>
          <Text style={styles.controlLabel}>Background Theme</Text>
          <View style={styles.swatchRow}>
            {Object.keys(GRADIENT_SCHEMES).map((schemeName) => (
              <TouchableOpacity
                key={schemeName}
                onPress={() => setActiveGradient(schemeName)}
                style={[
                  styles.swatchButton, 
                  { backgroundColor: GRADIENT_SCHEMES[schemeName][0] }, 
                  activeGradient === schemeName && styles.activeSwatch
                ]}
              />
            ))}
          </View>

          <Text style={[styles.controlLabel, { marginTop: 16 }]}>Output Channel Preset</Text>
          <View style={styles.tabsRow}>
            {['twitch', 'mobile-app', 'favicon'].map((preset) => (
              <TouchableOpacity
                key={preset}
                onPress={() => setActivePreset(preset)}
                style={[styles.tabButton, activePreset === preset && styles.activeTabButton]}
              >
                <Text style={[styles.tabText, activePreset === preset && styles.activeTabText]}>
                  {preset === 'mobile-app' ? 'App Squircle' : preset.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.compileButton, isCompiling && styles.disabledButton]} 
            onPress={handleCompileIcon}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.compileButtonText}>COMPILE BRAND ASSET (.ICO)</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: { paddingHorizontal: 24, paddingTop: 10, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: '800', color: '#f8fafc' },
  subtitle: { fontSize: 14, fontWeight: '500', color: '#64748b', marginTop: 4 },
  canvasContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  outerCanvasBounds: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: '#020617',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  controlsCard: { backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#1e293b' },
  controlLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  swatchRow: { flexDirection: 'row', gap: 12 },
  swatchButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#334155' },
  activeSwatch: { borderColor: '#38bdf8', transform: [{ scale: 1.08 }] },
  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tabButton: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  activeTabButton: { backgroundColor: '#0369a1' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  activeTabText: { color: '#ffffff' },
  compileButton: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  disabledButton: { backgroundColor: '#065f46' },
  compileButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 }
});
