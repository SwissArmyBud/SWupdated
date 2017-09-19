CONTAINER_VER="1.0"
PRODUCT_NAME="my-swupdate"
FILES="sw-description REMOVE.KEY"
for i in $FILES;do
        echo $i;done | cpio -ov -H crc >  update.swu
