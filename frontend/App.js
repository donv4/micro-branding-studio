import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { Canvas, Circle, Skia, Path, LinearGradient, vec, Image, useImage, useCanvasRef, Text as SkiaText, matchFont } from '@shopify/react-native-skia';
import * as FileSystemLegacy from 'expo-file-system/legacy';

const GRADIENT_SCHEMES = {
  indigo: ['#0f172a', '#1e1b4b', '#311042'],
  emerald: ['#022c22', '#064e3b', '#115e59'],
  cyberpunk: ['#1c0d2b', '#2e0854', '#701a75'],
  slate: ['#0f172a', '#1e293b', '#334155']
};

const { width: WINDOW_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = WINDOW_WIDTH * 0.88; 
const LOCAL_BACKEND_IP = '://vibezlabs.com'; 

const fontConfig = { fontFamily: "sans-serif", fontSize: 36, fontStyle: "normal", fontWeight: "bold" };
const skiaFont = matchFont(fontConfig);

export default function App() {
  const [activePreset, setActivePreset] = useState('twitch');
  const [activeGradient, setActiveGradient] = useState('indigo');
  const [brandingText, setBrandingText] = useState('VIBEZ');
  const [textColor, setTextColor] = useState('#ffffff');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  
  const canvasRef = useCanvasRef();
  const brandingBgImage = useImage("https://picsum.photos");

  const computedTextWidth = skiaFont ? skiaFont.measureText(brandingText).width : 0;
  const initialX = (CANVAS_SIZE / 2) - (computedTextWidth / 2);
  const initialY = (CANVAS_SIZE / 2) + 12;

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

  React.useEffect(() => {
    const nextWidth = skiaFont ? skiaFont.measureText(brandingText).width : 0;
    translateX.value = (CANVAS_SIZE / 2) - (nextWidth / 2);
    translateY.value = (CANVAS_SIZE / 2) + 12;
  }, [brandingText]);

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

  // Original .ICO Single Compiling Target Layer
  const handleCompileIcon = async () => {
    if (isCompiling) return;
    setIsCompiling(true);
    try {
      const image = canvasRef.current?.makeImageSnapshot();
      if (!image) throw new Error("Graphics frame not ready.");
      const data = image.encodeToBase64(1, 100);
      const response = await fetch(`http://${LOCAL_BACKEND_IP}:8787/branding/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBuffer: data }),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        let cleanBase64 = reader.result;
        if (cleanBase64.includes(',')) cleanBase64 = cleanBase64.split(',')[1];
        const permissions = await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) throw new Error("Storage access required.");
        const fileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(permissions.directoryUri, 'brand-identity.ico', 'image/x-icon');
        await FileSystemLegacy.writeAsStringAsync(fileUri, cleanBase64, { encoding: FileSystemLegacy.EncodingType.Base64 });
        Alert.alert("Success 🎉", "Icon saved directly to your public files!");
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      Alert.alert("Compilation Error", error.message);
    } finally { setIsCompiling(false); }
  };

  // 🚀 THE NEW 6-ASSET GENERATION ENGINE
  const handleGenerateAssetPack = async () => {
    if (isGeneratingPack) return;
    setIsGeneratingPack(true);

    try {
      // 1. Capture the raw master GPU surface data layer
      const masterSnapshot = canvasRef.current?.makeImageSnapshot();
      if (!masterSnapshot) throw new Error("Graphics pipeline busy.");

      // Request SAF workspace folder access from you
      const permissions = await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) throw new Error("Permission to save assets rejected.");

      // Definitive target layout configurations mapping array
      const assetTargets = [
        { name: 'icon.png', width: 1024, height: 1024 },
        { name: 'favicon.png', width: 48, height: 48 },
        { name: 'splash-icon.png', width: 1242, height: 2436 },
        { name: 'android-icon-foreground.png', width: 512, height: 512 },
        { name: 'android-icon-background.png', width: 512, height: 512 },
        { name: 'android-icon-monochrome.png', width: 512, height: 512 }
      ];

      for (const target of assetTargets) {
        // Allocate native hardware offscreen layout grids matching target dimensions
        const surface = Skia.Surface.Make(target.width, target.height);
        if (!surface) throw new Error(`Failed to allocate GPU surface for ${target.name}`);
        
        const offscreenCanvas = surface.getCanvas();

        // Fill background slate backdrop cleanly
        offscreenCanvas.clear(Skia.Color('#020617'));
        
        // 💡 THE FIX: Map the full bounds of the snapshot source image array
        const srcRect = Skia.XYWHRect(0, 0, masterSnapshot.width(), masterSnapshot.height());
        
        // Compute crisp uniform scale multipliers to expand elements seamlessly
        let dstRect;
        if (target.height > target.width) {
          // For tall Aspect Ratios (Splash Screens): Center the square logo vertically on the canvas
          const scale = target.width / masterSnapshot.width();
          const targetHeight = masterSnapshot.height() * scale;
          const yOffset = (target.height - targetHeight) / 2;
          dstRect = Skia.XYWHRect(0, yOffset, target.width, targetHeight);
        } else {
          // For standard square app icons (1024px, 512px, 48px): Stretch to match the boundaries exactly
          dstRect = Skia.XYWHRect(0, 0, target.width, target.height);
        }
        
        // Render the image with anti-aliasing interpolation filters enabled to keep lines crisp!
        const paint = Skia.Paint();
        paint.setAntiAlias(true);
        offscreenCanvas.drawImageRect(masterSnapshot, srcRect, dstRect, paint);

        // Encode directly to base64 binary strings natively on separate threads
        const scaledImage = surface.makeImageSnapshot();
        const base64Payload = scaledImage.encodeToBase64(1, 100);

        const targetFileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          target.name,
          'image/png'
        );

        await FileSystemLegacy.writeAsStringAsync(targetFileUri, base64Payload, {
          encoding: FileSystemLegacy.EncodingType.Base64
        });
      }


      Alert.alert("Assets Created! 🏁", "All 6 strict dimension configuration files generated and written to your folder successfully.");
    } catch (error) {
      console.error(error);
      Alert.alert("Generation Failed", error.message);
    } finally {
      setIsGeneratingPack(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#020617" />
          
          <View style={styles.header}>
            <Text style={styles.title}>Micro-Branding Studio</Text>
            <Text style={styles.subtitle}>6-Asset Generation Engine</Text>
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
                    {skiaFont && <SkiaText x={translateX} y={translateY} text={brandingText} font={skiaFont} color={textColor} />}
                  </Canvas>
                </Animated.View>
              </GestureDetector>
            </View>
          </View>

          <View style={styles.controlsCard}>
            <Text style={styles.controlLabel}>Branding Text Mark</Text>
            <TextInput style={styles.textInput} value={brandingText} onChangeText={setBrandingText} placeholder="ENTER LOGO TEXT" placeholderTextColor="#475569" maxLength={12} autoCapitalize="characters" />

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

            <Text style={[styles.controlLabel, { marginTop: 4 }]}>Preset</Text>
            <View style={styles.tabsRow}>
              {['twitch', 'mobile-app', 'favicon'].map((preset) => (
                <TouchableOpacity 
                  key={preset} 
                  onPress={() => setActivePreset(preset)} 
                  style={[styles.tabButton, activePreset === preset && styles.activeTabButton]}
                >
                  <Text style={[styles.tabText, activePreset === preset && styles.activeTabText]}>
                    {preset === 'mobile-app' ? 'SQUIRCLE' : preset.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons Row Configuration */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={[styles.compileButton, isCompiling && styles.disabledButton]} 
                onPress={handleCompileIcon} 
                disabled={isCompiling}
              >
                {isCompiling ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.actionButtonText}>COMPILE .ICO</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.packButton, isGeneratingPack && styles.disabledPackButton]} 
                onPress={handleGenerateAssetPack} 
                disabled={isGeneratingPack}
              >
                {isGeneratingPack ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.actionButtonText}>GENERATE 6-ASSET PACK</Text>}
              </TouchableOpacity>
            </View>
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
  controlsCard: { backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingVertical: 16, borderWidth: 1, borderColor: '#1e293b' },
  controlLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  textInput: { backgroundColor: '#1e293b', color: '#f8fafc', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, fontSize: 15, fontWeight: '700', marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  metaControlsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 10 },
  swatchRow: { flexDirection: 'row', gap: 8 },
  swatchButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#334155' },
  textColorButton: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: '#334155' },
  activeSwatch: { borderColor: '#38bdf8', transform: [{ scale: 1.05 }] },
  activeTextSwatch: { borderColor: '#ffffff', transform: [{ scale: 1.05 }] },
  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  tabButton: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  activeTabButton: { backgroundColor: '#0369a1' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  activeTabText: { color: '#ffffff' },
  actionButtonsContainer: { flexDirection: 'row', gap: 8, marginTop: 4 },
  compileButton: { flex: 1, backgroundColor: '#4b5563', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  packButton: { flex: 2, backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  disabledButton: { backgroundColor: '#374151' },
  disabledPackButton: { backgroundColor: '#065f46' },
  actionButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }
});