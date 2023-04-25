import { useEffect, useState } from 'react';
import { Text } from 'react-native';

export default function TimeNotifications(props) {
  const [count, setcount] = useState(10);
  
  useEffect(()=>{
    const Intime = setInterval(()=>{
      setcount(count-1);
    }, 1000)
    if(count<=0){
      clearInterval(Intime)
      props.autoCloseModal()
    }
    return ()=> {{clearInterval(Intime)}}
  }, [count])

  return (
    <Text>{count}</Text>
  );
}