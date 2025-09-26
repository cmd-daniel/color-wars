import React from "react"

type DiceTrackProps = React.PropsWithChildren<{}>;

const DiceTrack: React.FC<DiceTrackProps> = ({ children }) => {
    return(
        <div>{children}</div>
    )
}

export default DiceTrack