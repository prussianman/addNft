import React, {useState} from 'react';
import {StyleSheet, SafeAreaView, ScrollView} from 'react-native';
import {Button} from 'react-native-elements';
import t from 'tcomb-form-native';
import {Auth, API, graphqlOperation} from 'aws-amplify';
import {createNft} from '../graphql/mutations';
import {Storage} from 'aws-amplify';
import ImageUploader from '../components/ImageUploader';
import {launchImageLibrary} from 'react-native-image-picker';
// import {writeNdef, initNfc} from '../nfc/readWrite';
import NfcManager, {NfcTech, Ndef} from 'react-native-nfc-manager';
// import {ImagePicker} from 'react-native-image-crop-picker';

const Form = t.form.Form;
const User = t.struct({
  tokenId: t.Number,
  name: t.String,
  description: t.String,
});

const addNftScreen = ({navigation}) => {
  const [form, setForm] = useState(null); 
  const [initialValues, setInitialValues] = useState({});
  const [photo, setPhoto] = useState(null);

  const handleChoosePhoto = async () => {
    const nft = await form.getValue();
    // retrieve user data from cognito --> to insert pk from here too
    const userInfo = await Auth.currentAuthenticatedUser();

    setInitialValues({
      tokenId: nft.tokenId,
      userId: userInfo.username,
      name: nft.name,
      description: nft.description,

    });

    await launchImageLibrary({}, (response) => {
      console.log('TEST:')
      console.log(response.assets[0].uri);
      if (response.assets[0].uri) {
        console.log('Photo Extension: \n');
        console.log(response);
        setPhoto(response);
      }
    });
  };

  const options = {
    auto: 'placeholders',
    fields: {
      description: {
        multiLine: true,
        stylesheet: {
          ...Form.stylesheet,
          textbox: {
            ...Form.stylesheet.textbox,
            normal: {
              ...Form.stylesheet.textbox.normal,
              height: 100,
              textAlignVertical: 'top',
            },
          },
        },
      },
    },
  };

const handleSubmit = async () => {

    // Copied and pasted from example
    async function initNfc() {
      await NfcManager.start();
    }
    async function writeNdef() {
      let result = false;
      try {
        // Step 1
        await NfcManager.requestTechnology(NfcTech.Ndef, {
          alertMessage: 'Ready to write some NDEF',
        });
        const bytes = Ndef.encodeMessage([Ndef.textRecord('Hello NFC')]);
        if (bytes) {
          await NfcManager.ndefHandler // Step2
            .writeNdefMessage(bytes); // Step3
          // if (Platform.OS === 'ios') {
          //   await NfcManager.setAlertMessageIOS('Successfully write NDEF');
          // }
        }
        result = true;
      } catch (ex) {
        console.warn(ex);
      }
      // Step 4
      NfcManager.cancelTechnologyRequest().catch(() => 0);
      return result;
    }

  try {
    const value = await form.getValue();
    console.log(value);
    const userInfo = await Auth.currentAuthenticatedUser();
    // console.log(userInfo.username);
    // console.log('hello');
    // console.log(photo.assets[0].uri);
    console.log('nfc add:')

    initNfc();
    if (writeNdef()) {
      console.log('successfully wrote Nfc');
    }
    else {
      console.log('failed');
    }


    if (photo.assets[0].uri) {
      const photoResponse = await fetch(photo.assets[0].uri);
      const blob = await photoResponse.blob();
      await Storage.put(userInfo.username + '-' + value.tokenId, blob, {contentType: 'image/jpeg',});
    }


    const response = await API.graphql(
        graphqlOperation(createNft, {
          input: {
            userId: userInfo.username,
            tokenId: value.tokenId,
            name: value.name,
            description: value.description,
            Image: photo ? userInfo.username + '-' + value.tokenId : '',
          },
        }),
    );
    console.log(response);
    navigation.navigate('home');
  } catch (error) {
    console.log(error.message);
  }
};


  return (
      <>
      <SafeAreaView style={styles.addProductView}>
        <ScrollView>
          <Form
            ref={(c) => setForm(c)}
            value={initialValues}
            type={User}
            options={options}
          />
          <ImageUploader photo={photo} handleChoosePhoto={handleChoosePhoto} />
          <Button title="Save" onPress={handleSubmit} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  addNftView: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingTop: 15,
    height: 'auto',
  },
});

export default addNftScreen;
