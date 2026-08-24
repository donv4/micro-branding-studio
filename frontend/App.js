import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Canvas, Circle, Skia, Path, LinearGradient, vec, Image, useImage, useCanvasRef, Text as SkiaText, matchFont } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const GRADIENT_SCHEMES = {
  indigo: ['#0f172a', '#1e1b4b', '#311042'],
  emerald: ['#022c22', '#064e3b', '#115e59'],
  cyberpunk: ['#1c0d2b', '#2e0854', '#701a75'],
  slate: ['#0f172a', '#1e293b', '#334155']
};

const { width: WINDOW_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = WINDOW_WIDTH * 0.88; 
const LOCAL_BACKEND_IP = '192.168.100.6'; 

const fontConfig = { fontFamily: "sans-serif", fontSize: 36, fontStyle: "normal", fontWeight: "bold" };
const skiaFont = matchFont(fontConfig);

export default function App() {
  const [activePreset, setActivePreset] = useState('twitch');
  const [activeGradient, setActiveGradient] = useState('indigo');
  const [brandingText, setBrandingText] = useState('VIBEZ');
  const [textColor, setTextColor] = useState('#ffffff');
  const [isCompiling, setIsCompiling] = useState(false);
  
  const canvasRef = useCanvasRef();
  const brandingBgImage = useImage("https://picsum.photos");

  // 💡 Fix: Calculate the initial text placement dynamically inside the render loop!
  const computedTextWidth = skiaFont ? skiaFont.measureText(brandingText).width : 0;
  const initialX = (CANVAS_SIZE / 2) - (computedTextWidth / 2);
  const initialY = (CANVAS_SIZE / 2) + 12;

  // Track position shifts smoothly on separate threads
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = contextY.value + event.translationY;
    });

  // Automatically reset coordinate center bounds when logo text changes
  React.useEffect(() => {
    const nextWidth = skiaFont ? skiaFont.measureText(brandingText).width : 0;
    translateX.value = (CANVAS_SIZE / 2) - (nextWidth / 2);
    translateY.value = (CANVAS_SIZE / 2) + 12;
  }, [brandingText]);

  // Smooth transform mapping array linked directly to the container layer
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value }
    ],
  }));

  const getTextXPosition = () => {
    if (!skiaFont) return CANVAS_SIZE / 2;
    const textWidth = skiaFont.measureText(brandingText).width;
    return (CANVAS_SIZE / 2) - (textWidth / 2);
  };

  const getClipPath = () => {
    const half = CANVAS_SIZE / 2;
    if (activePreset === 'twitch') {
      return Skia.PathBuilder.Make().addCircle(half, half, half).build();
    } else if (activePreset === 'mobile-app') {
      const rect = Skia.XYWHRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      return Skia.PathBuilder.Make().addRRect(Skia.RRectXY(rect, 48, 48)).build();
    } else {
      const rect = Skia.XYWHRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      return Skia.PathBuilder.Make().addRect(rect).build();
    }
  };

  const handleCompileIcon = async () => {
    if (isCompiling) return;
    setIsCompiling(true);

    try {
      const image = canvasRef.current?.makeImageSnapshot();
      if (!image) throw new Error("Graphics frame not ready.");

      const data = image.encodeToBase64(1, 100);
      
      // 1. Send vector packets straight to your active edge worker loop
      const response = await fetch(`http://${LOCAL_BACKEND_IP}:8787/branding/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBuffer: data }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      // 2. Read the raw incoming binary stream file array directly from the response packet
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        
        // 3. Establish a physical, permanent file directory destination path on your phone's storage
        const localUri = `${FileSystem.documentDirectory}custom-launcher-icon.ico`;
        
        // Write the binary stream straight into your phone's physical hardware memory lines
        await FileSystem.writeAsStringAsync(localUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // 4. Pop open the system share sheet panel tray instantly on your Samsung S20+!
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(localUri, {
            mimeType: 'image/x-icon',
            dialogTitle: 'Save Custom App Icon Logo',
          });
        } else {
          Alert.alert("Success 🎉", "Icon saved internally to local document registry paths!");
        }
      };
      
      reader.readAsDataURL(blob);

    } catch (error) {
      console.error(error);
      Alert.alert("Compilation Error", error.message);
    } finally {
      setIsCompiling(false);
    }
  };
  
  // 1. Create a clean Reanimated Selector value derived from state
  const textWidth = skiaFont ? skiaFont.measureText(brandingText).width : 0;
  const defaultX = (CANVAS_SIZE / 2) - (textWidth / 2);
  const defaultY = (CANVAS_SIZE / 2) + 12;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#020617" />
          
          <View style={styles.header}>
            <Text style={styles.title}>Micro-Branding Studio</Text>
            <Text style={styles.subtitle}>Interactive Vector Engine</Text>
          </View>

          <View style={styles.canvasContainer} collapsable={false}>
            <View style={styles.outerCanvasBounds}>
              <GestureDetector gesture={panGesture}>
                <Animated.View style={styles.gestureCaptureWrapper}>
                  <Canvas ref={canvasRef} style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
                    <Path path={getClipPath()}>
                      <LinearGradient start={vec(0, 0)} end={vec(CANVAS_SIZE, CANVAS_SIZE)} colors={GRADIENT_SCHEMES[activeGradient]} />
                      {brandingBgImage && <Image image={brandingBgImage} x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE} fit="cover" />}
                    </Path>
                    
                    <Circle cx={CANVAS_SIZE / 2} cy={CANVAS_SIZE / 2} r={32} color="#ffffff" opacity={0.15} />

                    {/* 💡 Fix: Pass the shared value references directly without accessing `.value` during render! */}
                    {skiaFont && (
                      <SkiaText
                        x={translateX} // Skia listens directly to the animation mutable frame changes
                        y={translateY}
                        text={brandingText}
                        font={skiaFont}
                        color={textColor}
                      />
                    )}
                  </Canvas>
                </Animated.View>
              </GestureDetector>
            </View>
          </View>

          <View style={styles.controlsCard}>
            <Text style={styles.controlLabel}>Branding Text Mark</Text>
            <TextInput
              style={styles.textInput}
              value={brandingText}
              onChangeText={setBrandingText}
              placeholder="ENTER LOGO TEXT"
              placeholderTextColor="#475569"
              maxLength={12}
              autoCapitalize="characters"
            />

            <View style={styles.metaControlsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.controlLabel}>Theme</Text>
                <View style={styles.swatchRow}>
                  {Object.keys(GRADIENT_SCHEMES).map((schemeName) => (
                    <TouchableOpacity
                      key={schemeName}
                      onPress={() => setActiveGradient(schemeName)}
                      style={[styles.swatchButton, { backgroundColor: GRADIENT_SCHEMES[schemeName][0] }, activeGradient === schemeName && styles.activeSwatch]}
                    />
                  ))}
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.controlLabel}>Text Color</Text>
                <View style={styles.swatchRow}>
                  {['#ffffff', '#f59e0b', '#38bdf8', '#ec4899'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setTextColor(color)}
                      style={[styles.textColorButton, { backgroundColor: color }, textColor === color && styles.activeTextSwatch]}
                    />
                  ))}
                </View>
              </View>
            </View>

            <Text style={[styles.controlLabel, { marginTop: 14 }]}>Preset</Text>
            <View style={styles.tabsRow}>
              {['twitch', 'mobile-app', 'favicon'].map((preset) => (
                <TouchableOpacity key={preset} onPress={() => setActivePreset(preset)} style={[styles.tabButton, activePreset === preset && styles.activeTabButton]}>
                  <Text style={[styles.tabText, activePreset === preset && styles.activeTabText]}>
                    {preset === 'mobile-app' ? 'SQUIRCLE' : preset.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.compileButton, isCompiling && styles.disabledButton]} onPress={handleCompileIcon} disabled={isCompiling}>
              {isCompiling ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.compileButtonText}>COMPILE BRAND ASSET (.ICO)</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: { paddingHorizontal: 24, paddingTop: 10, marginBottom: 5 },
  title: { fontSize: 26, fontWeight: '800', color: '#f8fafc' },
  subtitle: { fontSize: 14, fontWeight: '500', color: '#64748b', marginTop: 2 },
  canvasContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  outerCanvasBounds: { width: CANVAS_SIZE, height: CANVAS_SIZE, backgroundColor: '#020617', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  gestureCaptureWrapper: { width: CANVAS_SIZE, height: CANVAS_SIZE },
  controlsCard: { backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingVertical: 20, borderWidth: 1, borderColor: '#1e293b' },
  controlLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  textInput: { backgroundColor: '#1e293b', color: '#f8fafc', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, fontSize: 15, fontWeight: '700', marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  metaControlsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 12 },
  swatchRow: { flexDirection: 'row', gap: 8 },
  swatchButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#334155' },
  textColorButton: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: '#334155' },
  activeSwatch: { borderColor: '#38bdf8', transform: [{ scale: 1.05 }] },
  activeTextSwatch: { borderColor: '#ffffff', transform: [{ scale: 1.05 }] },
  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  tabButton: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  activeTabButton: { backgroundColor: '#0369a1' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  activeTabText: { color: '#ffffff' },
  compileButton: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  disabledButton: { backgroundColor: '#065f46' },
  compileButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 }
});