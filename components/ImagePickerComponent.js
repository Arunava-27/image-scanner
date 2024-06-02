import React, { useState, useEffect } from 'react';
import {
  View,
  Button,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  Share,
  StatusBar,
  LogBox,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getApps, initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';

// Firebase configuration
const firebaseConfig = {
  storageBucket: 'imagescanner-3cb4a.appspot.com',
  messagingSenderId: '352034257442',
};

// Initialize Firebase
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

// Firebase sets some timers for a long period, which will trigger some warnings. Let's turn that off for this example
LogBox.ignoreLogs(['Setting a timer for a long period']);

const ImagePickerComponent = () => {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadTask, setUploadTask] = useState(null);

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Sorry, we need camera roll permissions to make this work!');
        }
      }
    };

    requestPermissions();
  }, []);

  const maybeRenderUploadingOverlay = () => {
    if (uploading) {
      return (
        <View style={[StyleSheet.absoluteFill, styles.uploadingOverlay]}>
          <ActivityIndicator color="#fff" animating size="large" />
        </View>
      );
    }
  };

  const maybeRenderImage = () => {
    if (!image) {
      return null;
    }

    return (
      <View style={styles.imageContainer}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: image }} style={styles.image} />
        </View>
        <Text onPress={copyToClipboard} onLongPress={shareImage} style={styles.imageText}>
          {image}
        </Text>
        {!uploading && <Button onPress={uploadImage} title="Upload Image" />}
        {!uploading && (
          <View style={styles.cancelButtonContainer}>
            <Button onPress={cancelUpload} title="Cancel Upload" color="#ff0000" />
          </View>
        )}
      </View>
    );
  };

  const shareImage = () => {
    Share.share({
      message: image,
      title: 'Check out this photo',
      url: image,
    });
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(image);
    Alert.alert('Copied image URL to clipboard');
  };

  const takePhoto = async () => {
    let pickerResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!pickerResult.canceled) {
      setImage(pickerResult.assets[0].uri);
    }
  };

  const pickImage = async () => {
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!pickerResult.canceled) {
      setImage(pickerResult.assets[0].uri);
    }
  };

  const uploadImage = async () => {
    try {
      setUploading(true);
      const { uri } = { uri: image };
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          console.log(e);
          reject(new TypeError('Network request failed'));
        };
        xhr.responseType = 'blob';
        xhr.open('GET', uri, true);
        xhr.send(null);
      });

      const fileRef = ref(getStorage(), await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, new Date().toISOString()));
      const uploadTask = uploadBytesResumable(fileRef, blob);
      setUploadTask(uploadTask);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress function ...
        },
        (error) => {
          // Error function ...
          console.error(error);
          Alert.alert('Upload failed, sorry :(');
          setUploading(false);
        },
        async () => {
          // Complete function ...
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setImage(downloadURL);
          Alert.alert('Image uploaded successfully', downloadURL);
          setUploading(false);
        }
      );
    } catch (e) {
      console.log(e);
      Alert.alert('Upload failed, sorry :(');
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    if (uploadTask) {
      uploadTask.cancel();
      Alert.alert('Upload cancelled');
      setUploading(false);
      setUploadTask(null);
      setImage(null); // Reset image to initial state
    }
  };

  return (
    <View style={styles.container}>
      <Button onPress={pickImage} title="Pick an image from camera roll" />

      <Button onPress={takePhoto} title="Take a photo" />

      {maybeRenderImage()}
      {maybeRenderUploadingOverlay()}

      <StatusBar barStyle="default" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
    marginHorizontal: 15,
  },
  uploadingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    marginTop: 30,
    width: 250,
    borderRadius: 3,
    elevation: 2,
    alignItems: 'center',
  },
  imageWrapper: {
    borderTopRightRadius: 3,
    borderTopLeftRadius: 3,
    shadowColor: 'rgba(0,0,0,1)',
    shadowOpacity: 0.2,
    shadowOffset: { width: 4, height: 4 },
    shadowRadius: 5,
    overflow: 'hidden',
  },
  image: {
    width: 250,
    height: 250,
  },
  imageText: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  cancelButtonContainer: {
    marginTop: 10,
    width: '80%',
  },
});

export default ImagePickerComponent;
