import React, {useContext, useEffect, useState} from "react";
import {Backdrop, Box, CircularProgress, Modal} from "@mui/material";
import styles from "../navBar/navbar.module.css";
import {Constants, errorToast, localStorageKeys, Themes} from "../../utils/constants";
import {Images} from "../../utils/images";
import SimpleInputComponent from "../inputComponent/simpleInputComponent";
import BlueButton from "../buttonComponent/blueButtonComponent";
import {ThemeContext} from "../../App";
import {colors} from "../../utils/color";
import {StoreContext} from "../../context/context";
import {getConfigData, setConfigData} from "../../services/workspace";
import {uploadToGoogleDrive} from "../../services/googleDrive";
import {uploadModelDetails} from "../../apis/models";
import {getModelSettings, readTfliteModel} from "../../utils/tfliteModel";

const UNSUPPORTED_MODEL_MESSAGE = "This model can't run in the OpenBot app. Use an autopilot, navigation, MobileNet, EfficientDet, YOLOv4 or YOLOv5 model.";

/**
 * function to upload new model (.tflite)
 * @param params
 * @returns {JSX.Element}
 * @constructor
 */
export function ModelUploadingComponent(params) {
    const {isAIModelComponent, setIsAIModelComponent, file, setIsSubscriptionExpire} = params
    const {theme} = useContext(ThemeContext);
    const {isOnline} = useContext(StoreContext);
    const localFileName = file?.name.replace(/\.[^/.]+$/, "");
    const [fileName, setFileName] = useState(localFileName ?? "");
    const [isDesktopLargerScreen, setIsDesktopLargerScreen] = useState(window.matchMedia("(min-height: 900px)").matches);
    const [fileUploadLoader, setFileUploadLoader] = useState(false);
    const [modelClassDropdown, setModelClassDropdown] = useState("");
    const [modelDetails, setModelDetails] = useState({
        displayName: localFileName
    })
    // Type, classes and size read from the model file; null until read or when unsupported.
    const [modelSettings, setModelSettings] = useState(null);
    const [isUnsupportedModel, setIsUnsupportedModel] = useState(false);

    //function to close the model
    const handleClose = () => {
        setIsAIModelComponent(false)
    }

    //Loader on submit button
    function SimpleBackdrop() {
        return (
            <div>
                <Backdrop
                    sx={{color: colors.openBotBlue, zIndex: (theme) => theme.zIndex.drawer + 1}}
                    open={fileUploadLoader}
                >
                    <CircularProgress color="inherit"/>
                </Backdrop>
            </div>
        );
    }

    //function to handle file name
    function handleTfliteNameChange(e) {
        if (!(e.trim().length <= 0)) {
            setModelDetails({
                ...modelDetails,
                displayName: e
            })
            setFileName(e);
        } else {
            setFileName(localFileName)
        }
    }

    useEffect(() => {
        const handleOrientationChange = () => {
            setIsDesktopLargerScreen(
                window.matchMedia("(min-height: 900px)").matches
            );
        };
        window.addEventListener("resize", handleOrientationChange);
    }, []);

    // Read the model file, so only the type, class and size the apps can run are offered.
    useEffect(() => {
        if (!file) {
            return;
        }
        setModelSettings(null);
        setIsUnsupportedModel(false);
        file.arrayBuffer()
            .then((buffer) => {
                const settings = getModelSettings(readTfliteModel(buffer));
                if (!settings) {
                    setIsUnsupportedModel(true);
                    return;
                }
                setModelSettings(settings);
                setModelClassDropdown(settings.classes[0]);
            })
            .catch(() => setIsUnsupportedModel(true));
    }, [file])

    /**
     * function to save and add new model
     * @returns {Promise<void>}
     */
    async function handleSubmit() {
        // Only models the apps can run are saved.
        if (!modelSettings) {
            errorToast(isUnsupportedModel ? UNSUPPORTED_MODEL_MESSAGE : "Reading the model, please try again.")
            return;
        }
        if (isOnline) {
            if (localStorage.getItem("isSigIn") === "true") {
                setFileUploadLoader(true);
                const data = {
                    fileData: file,
                    name: modelDetails.displayName
                }
                await setConfigData().then(async (foundOnDrive) => {
                    // Don't save an old list over Drive when it can't be read.
                    if (foundOnDrive === null) {
                        setFileUploadLoader(false);
                        errorToast("Something went wrong!")
                        return;
                    }
                    let configData = getConfigData()
                    await uploadToGoogleDrive(data, Constants.tflite).then(async (res) => {
                        let newModelData = {
                            id: Math.max(0, ...configData.map((model) => model.id)) + 1,
                            name: modelDetails.displayName + `.${Constants.tflite}`,
                            pathType: "URL",
                            path: res,
                            type: modelSettings.type,
                            class: modelClassDropdown,
                            inputSize: `${modelSettings.width}x${modelSettings.height}`
                        }
                        configData.push(newModelData)
                        await uploadToGoogleDrive(JSON.stringify(configData), Constants.json).then(async () => {
                            localStorage.setItem(localStorageKeys.configData, JSON.stringify(configData))
                            setFileUploadLoader(false);
                            handleClose()
                        })
                            .catch((err) => {
                                setFileUploadLoader(false);
                                console.log(err);
                            })
                    })
                        .catch((err) => {
                            setFileUploadLoader(false);
                            console.log(err);
                        })
                })
            } else {
                errorToast("Please sign-In to add model.")
            }
        } else {
            errorToast(Constants.InternetOffMsg)
        }
    }

    return (
        <Modal
            open={isAIModelComponent}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "scroll",
            }}>
            <Box
                className={styles.editProfileModal + " " + (theme === Themes.dark && styles.darkEditProfileModal)}>
                <div className={styles.crossIconDiv}>
                    <img onClick={handleClose} alt={"cross icon"} className={styles.crossIcon}
                         src={theme === Themes.dark ? Images.darkCrossIcon : Images.lightCrossIcon}/>
                </div>
                {/* model heading */}
                <div className={styles.modelHeading}
                     style={{color: theme === Themes.dark ? colors.whiteFont : colors.blackFont}}>
                    Model Details
                </div>
                {fileUploadLoader && <SimpleBackdrop/>}
                <div style={{display: "flex", paddingTop: isDesktopLargerScreen && "3%"}}>
                    <SimpleInputComponent inputType={"text"} extraStyle={styles.inputExtraStyle}
                                          headStyle={styles.headStyle}
                                          value={fileName}
                                          inlineStyle={{
                                              height: "50%",
                                              backgroundColor: theme === "dark" ? "#414141" : colors.whiteBackground
                                          }}
                                          onDataChange={handleTfliteNameChange}
                                          modelExtension={true}
                                          inputTitle={"Model Name"} extraInputStyle={styles.extraInputStyle}
                    />
                    <SimpleInputComponent inputType={"email"} inputTitle={"Type"}
                                          value={modelSettings?.type ?? ""}
                                          inlineStyle={{height: "50%"}}
                                          extraStyle={styles.inputExtraStyle} extraInputStyle={styles.extraInputStyle}/>
                </div>
                <div style={{display: "flex"}}>
                    <SimpleInputComponent inputType={"dropdown"} inputTitle={"Class"}
                                          modelClassDropdown={modelClassDropdown}
                                          setModelClassDropdown={setModelClassDropdown}
                                          modelData={modelSettings?.classes ?? []}
                                          extraStyle={styles.inputExtraStyle}
                                          extraInputStyle={styles.extraInputStyle}
                    />
                    <SimpleInputComponent inputType={"dimensions"} inputTitle={"Input(w × h)"}
                                          widthValue={modelSettings?.width}
                                          heightValue={modelSettings?.height}
                                          extraInputStyle={styles.extraInputStyle}
                                          extraStyle={styles.inputExtraStyle} extraMargin={styles.dropdownMargin}/>

                </div>
                {isUnsupportedModel &&
                    <div style={{color: colors.errorRed, padding: "0 5%"}}>{UNSUPPORTED_MODEL_MESSAGE}</div>}
                <div className={styles.buttonSection}>
                    <BlueButton buttonType={"contained"} buttonName={"Save"} onClick={handleSubmit}
                                inlineStyle={modelSettings ? undefined : {opacity: 0.5}}
                                buttonStyle={styles.buttonText}/>
                    <BlueButton onClick={handleClose} buttonName={"Cancel"} buttonStyle={styles.buttonText}/>
                </div>
            </Box>

        </Modal>
    )
}
