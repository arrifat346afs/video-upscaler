import { Button } from '../ui/button'
import { FileVideo } from 'lucide-react'

type UploadButtonProps = {
  onVideoSelected: (path: string) => void
  disabled?: boolean
}

export const UploadButton = ({
  onVideoSelected,
  disabled
}: UploadButtonProps): React.ReactElement => {
  const handleClick = async (): Promise<void> => {
    const path = await window.api.selectVideo()
    if (path) {
      onVideoSelected(path)
    }
  }

  return (
    <Button
      variant="secondary"
      className="w-full rounded-full"
      onClick={handleClick}
      disabled={disabled}
    >
      <FileVideo />
      Select Video
    </Button>
  )
}
