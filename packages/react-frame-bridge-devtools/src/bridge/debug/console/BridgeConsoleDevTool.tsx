"use client"

import {SVGProps, useEffect, useMemo, useRef, useState} from "react";
import {Listbox, ListboxButton, ListboxOption, ListboxOptions} from "@headlessui/react";
import {ChevronDownIcon} from "@heroicons/react/24/outline";
import {Button} from "@/button/Button";
import {TabSwitch} from "@/TabSwitch";
import clsx from "clsx";
import {TrashIcon} from "@heroicons/react/24/solid";
import {DevTool, DevToolProps} from "@/dev/DevTool";
import {useBridgeRegistryState} from "@/bridge/debug/useBridgeRegistry";
import {ConsoleTab} from "@/bridge/debug/console/types";
import {BridgeConsoleMessagesTab} from "@/bridge/debug/console/BridgeConsoleMessagesTab";
import {BridgeConsoleStateTab} from "@/bridge/debug/console/BridgeConsoleStateTab";

interface AppConsoleDevToolProps {
    buttonPosition: DevToolProps["buttonPosition"];
    offset?: DevToolProps["offset"];
}

export const BridgeConsoleDevTool = ({buttonPosition, offset}: AppConsoleDevToolProps) => {

    const {bridges, clear} = useBridgeRegistryState();
    const [selectedBridgeId, setSelectedBridgeId] = useState<string>("");
    const userSelectionRef = useRef(false);
    const [consoleTab, setConsoleTab] = useState<ConsoleTab>(`state`);
    const [prettyJson, setPrettyJson] = useState(false);

    const selectedBridge = useMemo(() => {
        return bridges.find(b => b.id === selectedBridgeId) ?? null;
    }, [bridges, selectedBridgeId]);

    useEffect(() => {
        if (bridges.length === 0) {
            setSelectedBridgeId("");
            userSelectionRef.current = false;
            return;
        }
        if (bridges.length > 0 && !userSelectionRef.current) {
            setSelectedBridgeId(bridges[bridges.length-1].id);
        }
    }, [selectedBridgeId, bridges]);

    const handleSelectBridgeId = (id: string) => {
        userSelectionRef.current = true;
        setSelectedBridgeId(id);
    }

    const bridgeSelectionNode = useMemo(() => {
        return (
            <div className={`flex flex-row items-center justify-end w-full`}>
                <Listbox disabled={bridges.length === 0} value={selectedBridgeId} onChange={handleSelectBridgeId}>
                    <ListboxButton
                        className="border border-gray-200 text-black/60 rounded-md px-2 h-6 flex items-center gap-2 max-w-[300px]">
                        <div className={`line-clamp-1 text-left text-sm`}>{selectedBridge ? `${selectedBridge.channelName} (${selectedBridge.id})` : `No registered bridges`}</div>
                        <ChevronDownIcon className="size-4"/>
                    </ListboxButton>

                    <ListboxOptions
                        anchor="bottom start"
                        portal
                        className="z-[9999999] max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-md p-1 mt-1 text-sm"
                    >
                        {bridges.map((bridge) => (
                            <ListboxOption
                                key={bridge.id}
                                value={bridge.id}
                                className="cursor-pointer rounded px-2 py-1 data-[focus]:bg-blue-100"
                            >
                                {bridge.channelName} ({bridge.id})
                            </ListboxOption>
                        ))}
                    </ListboxOptions>
                </Listbox>
            </div>
        )
    }, [bridges, selectedBridgeId])

    const clearButton = useMemo(() => {
        return (
            <Button onClick={() => clear(selectedBridgeId)}
                    className={`border border-gray-200 text-black/60 text-sm rounded-md p-1 flex items-center gap-2 whitespace-nowrap h-6`}>
                <TrashIcon className={`size-4 `} />
            </Button>
        )
    }, [selectedBridgeId]);

    const prettyJsonButton = useMemo(() => {
        return (
            <Button onClick={() => setPrettyJson(prev => !prev)}
                    className={`border border-gray-200 text-black/60 rounded-md p-1 flex items-center gap-2 whitespace-nowrap h-6`}>
                <JsonIcon className={clsx(`size-4`, prettyJson ? `text-teal-600` : `text-gray-400`)} />
            </Button>
        )
    }, [prettyJson]);

    const prettyTabName = (tab: ConsoleTab) => {
        switch (tab) {
            case `state`: return `State`;
            case `messages`: return `Messages`;
        }
    }

    return (
        <DevTool
            toolName={`Bridge Console`}
            buttonPosition={buttonPosition}
            offset={offset}
            devToolHeader={(
                <div className={`flex flex-row items-center gap-2 justify-between w-full h-full pl-4 pr-8`}>
                    <TabSwitch
                        items={[`state`, `messages`]}
                        selectedValue={consoleTab}
                        onSelect={setConsoleTab}
                        className={`gap-2`}
                        buttonClassName={`px-3  text-black/60 border-gray-200 selected:border-black border-b-2 h-6 font-medium`}>
                        {(item) => (
                            <span>{prettyTabName(item)}</span>
                        )}
                    </TabSwitch>
                    <div className={`flex flex-row items-center gap-1 h-full`}>
                        {clearButton}
                        {bridgeSelectionNode}
                        {prettyJsonButton}
                    </div>
                </div>
            )}
            devToolContent={(
                <div
                    className={`overflow-y-scroll w-full flex flex-col gap-2 h-full relative pr-2 pb-4`}>
                    {consoleTab === `messages` && selectedBridge &&
                        <BridgeConsoleMessagesTab snapshot={selectedBridge} prettyJson={prettyJson}/>}
                    {consoleTab === `state` && selectedBridge && <BridgeConsoleStateTab snapshot={selectedBridge}/>}
                    {!selectedBridge && (
                        <div className={`flex flex-col items-center justify-center gap-2 text-center w-full h-full`}>
                            <span className={`text-xl`}>No bridge selected</span>
                            <span className={`text-gray-500`}>Please select a bridge to view its details.</span>
                        </div>
                    )}
                </div>
            )}/>
    )
}

const JsonIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg width="800px" height="800px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" {...props}>
        <path fillRule="evenodd" clipRule="evenodd"
              d="M6 2.984V2h-.09c-.313 0-.616.062-.909.185a2.33 2.33 0 0 0-.775.53 2.23 2.23 0 0 0-.493.753v.001a3.542 3.542 0 0 0-.198.83v.002a6.08 6.08 0 0 0-.024.863c.012.29.018.58.018.869 0 .203-.04.393-.117.572v.001a1.504 1.504 0 0 1-.765.787 1.376 1.376 0 0 1-.558.115H2v.984h.09c.195 0 .38.04.556.121l.001.001c.178.078.329.184.455.318l.002.002c.13.13.233.285.307.465l.001.002c.078.18.117.368.117.566 0 .29-.006.58-.018.869-.012.296-.004.585.024.87v.001c.033.283.099.558.197.824v.001c.106.273.271.524.494.753.223.23.482.407.775.53.293.123.596.185.91.185H6v-.984h-.09c-.2 0-.387-.038-.563-.115a1.613 1.613 0 0 1-.457-.32 1.659 1.659 0 0 1-.309-.467c-.074-.18-.11-.37-.11-.573 0-.228.003-.453.011-.672.008-.228.008-.45 0-.665a4.639 4.639 0 0 0-.055-.64 2.682 2.682 0 0 0-.168-.609A2.284 2.284 0 0 0 3.522 8a2.284 2.284 0 0 0 .738-.955c.08-.192.135-.393.168-.602.033-.21.051-.423.055-.64.008-.22.008-.442 0-.666-.008-.224-.012-.45-.012-.678a1.47 1.47 0 0 1 .877-1.354 1.33 1.33 0 0 1 .563-.121H6zm4 10.032V14h.09c.313 0 .616-.062.909-.185.293-.123.552-.3.775-.53.223-.23.388-.48.493-.753v-.001c.1-.266.165-.543.198-.83v-.002c.028-.28.036-.567.024-.863-.012-.29-.018-.58-.018-.869 0-.203.04-.393.117-.572v-.001a1.502 1.502 0 0 1 .765-.787 1.38 1.38 0 0 1 .558-.115H14v-.984h-.09c-.196 0-.381-.04-.557-.121l-.001-.001a1.376 1.376 0 0 1-.455-.318l-.002-.002a1.415 1.415 0 0 1-.307-.465v-.002a1.405 1.405 0 0 1-.118-.566c0-.29.006-.58.018-.869a6.174 6.174 0 0 0-.024-.87v-.001a3.537 3.537 0 0 0-.197-.824v-.001a2.23 2.23 0 0 0-.494-.753 2.331 2.331 0 0 0-.775-.53 2.325 2.325 0 0 0-.91-.185H10v.984h.09c.2 0 .387.038.562.115.174.082.326.188.457.32.127.134.23.29.309.467.074.18.11.37.11.573 0 .228-.003.452-.011.672-.008.228-.008.45 0 .665.004.222.022.435.055.64.033.214.089.416.168.609a2.285 2.285 0 0 0 .738.955 2.285 2.285 0 0 0-.738.955 2.689 2.689 0 0 0-.168.602c-.033.21-.051.423-.055.64a9.15 9.15 0 0 0 0 .666c.008.224.012.45.012.678a1.471 1.471 0 0 1-.877 1.354 1.33 1.33 0 0 1-.563.121H10z"/>
    </svg>
)